import mongoose, { type HydratedDocument } from 'mongoose'
import Admission from '@/lib/models/Admission'
import Order, { type OrderDocument } from '@/lib/models/Order'
// Registers schemas for .populate()
import '@/lib/models/Show'
import '@/lib/models/Tour'
import { formatShowDate } from '@/lib/format'
import { toWallIso } from '@/lib/wallDate'
import {
  admissionCounts,
  bookingGroupKey,
  bookingLine,
  buildAdmissionHistory,
  guestDisplayName,
  legacyCheckedInTickets,
  orderMatchesDoorSearch,
  parseDoorSearch,
  pickAdmitTickets,
  type AdmissionOrder,
  type Booking,
  type BookingShow,
  type BookingSummary,
  type LedgerRecord,
} from '@/lib/tickets/admissions'
import { NOT_SCAN_PRACTICE_SESSION } from '@/lib/tickets/scanPractice'

export type DoorOrder = HydratedDocument<OrderDocument>

/** The staff member signed in to the scanner, stamped on everything they do. */
export type Usher = { id: string; name: string; email: string }

type ShowLike = {
  _id: unknown
  city?: string
  venue?: string
  date?: Date
  tour?: { title?: string } | null
} | null

const SEARCH_STATUSES = ['paid', 'refunded', 'transferred']
const MAX_SEARCH_RESULTS = 25
/** Lost races are retried against fresh counts; this many in a row means something else is wrong. */
const CLAIM_ATTEMPTS = 6

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function orderShowId(order: { show?: unknown }) {
  const show = order.show as { _id?: unknown } | mongoose.Types.ObjectId | null | undefined
  if (!show) return ''
  if (typeof show === 'object' && '_id' in show && show._id) return String(show._id)
  return String(show)
}

function serializeShow(order: { show?: unknown }): BookingShow | null {
  const show = order.show as ShowLike
  if (!show || typeof show !== 'object' || !('_id' in show)) return null
  return {
    id: String(show._id),
    city: show.city || '',
    venue: show.venue || '',
    date: show.date ? formatShowDate(toWallIso(show.date) || String(show.date)).full : '',
    tour: show.tour && typeof show.tour === 'object' ? show.tour.title || '' : '',
  }
}

function summarize(anchor: AdmissionOrder & { show?: unknown }, orders: AdmissionOrder[]): BookingSummary {
  const lines = orders.map(bookingLine)
  return {
    anchorOrderId: String(anchor._id),
    name: guestDisplayName(anchor),
    email: String(anchor.email || '') === 'pending@checkout' ? '' : String(anchor.email || ''),
    show: serializeShow(anchor),
    lines,
    purchased: lines.reduce((sum, line) => sum + (line.state === 'open' ? line.purchased : 0), 0),
    admitted: lines.reduce((sum, line) => sum + (line.state === 'open' ? line.admitted : 0), 0),
    remaining: lines.reduce((sum, line) => sum + line.remaining, 0),
  }
}

export async function loadDoorOrder(orderId: string): Promise<DoorOrder | null> {
  if (!mongoose.isValidObjectId(orderId)) return null
  return Order.findById(orderId).populate({ path: 'show', populate: { path: 'tour' } })
}

/** The scanned or searched order on its own, with no guest details: used when the door turns it away. */
export function bareBooking(anchor: DoorOrder, opts: { hideGuest: boolean }): Booking {
  const summary = summarize(anchor, [anchor])
  return {
    ...summary,
    name: opts.hideGuest ? '' : summary.name,
    email: opts.hideGuest ? '' : summary.email,
    history: [],
  }
}

/**
 * Everything the door needs for one guest: the order that was scanned or
 * picked, any other ticket classes the same guest holds for the same show,
 * and the admission history across them.
 */
export async function loadBooking(anchor: DoorOrder): Promise<Booking> {
  const showId = orderShowId(anchor)
  const key = bookingGroupKey(anchor)
  let siblings: DoorOrder[] = []
  if (anchor.status === 'paid' && key && showId) {
    const candidates = await Order.find({
      show: showId,
      email: anchor.email,
      status: 'paid',
      _id: { $ne: anchor._id },
    })
      .sort({ createdAt: 1 })
      .limit(40)
    siblings = candidates.filter(
      (order) => bookingGroupKey(order) === key && admissionCounts(order).purchased > 0,
    )
  }

  const orders = [anchor, ...siblings]
  const records = await Admission.find({ order: { $in: orders.map((order) => order._id) } })
    .sort({ createdAt: 1 })
    .lean()

  const ledger: LedgerRecord[] = records.map((record) => ({
    id: String(record._id),
    orderId: String(record.order),
    kind: record.kind,
    quantity: record.quantity,
    tierName: record.tierName || '',
    usherName: record.usherName || record.usherEmail || '',
    method: record.method,
    at: record.createdAt,
    reverses: record.reverses ? String(record.reverses) : null,
    reason: record.reason || '',
  }))

  return { ...summarize(anchor, orders), history: buildAdmissionHistory(orders, ledger) }
}

export type AdmitResult =
  | { ok: true; tickets: number[]; admissionId: string }
  | { ok: false; reason: 'not_found' | 'closed' | 'insufficient'; remaining: number }

/**
 * Admit `quantity` guests against one order.
 *
 * The claim is a single conditional update: it only lands if none of the
 * chosen ticket numbers has been admitted or voided in the meantime. Two
 * doors admitting from the same booking at once therefore cannot go past
 * its allocation; the loser re-reads the counts and either takes different
 * tickets or is told how many are left.
 */
export async function admitOnOrder(input: {
  orderId: string
  quantity: number
  /** Ticket number on the scanned QR code, used first when it is still open. */
  preferTicket?: number | null
  usher: Usher
  method: 'scan' | 'search'
}): Promise<AdmitResult> {
  const quantity = Math.floor(Number(input.quantity) || 0)
  if (!mongoose.isValidObjectId(input.orderId) || quantity < 1) {
    return { ok: false, reason: 'not_found', remaining: 0 }
  }

  for (let attempt = 0; attempt < CLAIM_ATTEMPTS; attempt += 1) {
    const order = await Order.findById(input.orderId)
      .select('show status quantity tierName voidedTickets checkedIn')
      .lean()
    if (!order) return { ok: false, reason: 'not_found', remaining: 0 }
    if (order.status !== 'paid') return { ok: false, reason: 'closed', remaining: 0 }

    const counts = admissionCounts(order)
    if (counts.remaining < quantity) {
      return { ok: false, reason: 'insufficient', remaining: counts.remaining }
    }

    const tickets = pickAdmitTickets(counts.open, quantity, input.preferTicket)
    const admissionId = new mongoose.Types.ObjectId()
    const at = new Date()
    const claimed = await Order.findOneAndUpdate(
      {
        _id: order._id,
        status: 'paid',
        'checkedIn.ticket': { $nin: tickets },
        'voidedTickets.ticket': { $nin: tickets },
      },
      {
        $push: {
          checkedIn: { $each: tickets.map((ticket) => ({ ticket, at, admission: admissionId })) },
        },
      },
      // The sale itself has not changed, so its updatedAt stays put.
      { returnDocument: 'after', timestamps: false },
    ).select('_id')
    if (!claimed) continue

    try {
      await Admission.create({
        _id: admissionId,
        order: order._id,
        show: order.show,
        kind: 'admit',
        tickets,
        quantity: tickets.length,
        tierName: order.tierName || '',
        usherId: input.usher.id,
        usherName: input.usher.name,
        usherEmail: input.usher.email,
        method: input.method,
      })
    } catch (error) {
      // No history, no admission: hand the places back rather than let guests in unrecorded.
      await Order.updateOne(
        { _id: order._id },
        { $pull: { checkedIn: { admission: admissionId } } },
        { timestamps: false },
      ).catch((rollbackError) => console.error('Admission rollback failed:', rollbackError))
      throw error
    }

    return { ok: true, tickets, admissionId: String(admissionId) }
  }

  const latest = await Order.findById(input.orderId).select('status quantity voidedTickets checkedIn').lean()
  return {
    ok: false,
    reason: 'insufficient',
    remaining: latest && latest.status === 'paid' ? admissionCounts(latest).remaining : 0,
  }
}

export type ReverseResult =
  | { ok: true; quantity: number }
  | { ok: false; reason: 'not_found' | 'already_reversed' | 'nothing_to_reverse' }

function isDuplicateKey(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: number }).code === 11000)
}

/**
 * Reverse one admission: its places go back to remaining, and the reversal
 * is written to the ledger under the supervisor's name. The original entry
 * stays as it was.
 */
export async function reverseAdmission(input: {
  admissionId: string
  usher: Usher
  reason: string
}): Promise<ReverseResult> {
  if (!mongoose.isValidObjectId(input.admissionId)) return { ok: false, reason: 'not_found' }
  const target = await Admission.findById(input.admissionId)
  if (!target || target.kind !== 'admit') return { ok: false, reason: 'not_found' }
  if (await Admission.exists({ reverses: target._id })) {
    return { ok: false, reason: 'already_reversed' }
  }

  let reversal
  try {
    reversal = await Admission.create({
      order: target.order,
      show: target.show,
      kind: 'reversal',
      tickets: target.tickets,
      quantity: target.quantity,
      tierName: target.tierName,
      usherId: input.usher.id,
      usherName: input.usher.name,
      usherEmail: input.usher.email,
      method: target.method,
      reverses: target._id,
      reason: input.reason.slice(0, 280),
    })
  } catch (error) {
    if (isDuplicateKey(error)) return { ok: false, reason: 'already_reversed' }
    throw error
  }

  try {
    await Order.updateOne(
      { _id: target.order },
      { $pull: { checkedIn: { admission: target._id } } },
      { timestamps: false },
    )
  } catch (error) {
    await Admission.deleteOne({ _id: reversal._id }).catch((rollbackError) =>
      console.error('Reversal rollback failed:', rollbackError),
    )
    throw error
  }

  return { ok: true, quantity: target.quantity }
}

/**
 * Reverse check-ins that were made before admission history existed. There
 * is no original entry to point at, so the reversal stands on its own.
 */
export async function reverseLegacyCheckIns(input: {
  orderId: string
  usher: Usher
  reason: string
}): Promise<ReverseResult> {
  if (!mongoose.isValidObjectId(input.orderId)) return { ok: false, reason: 'not_found' }
  const order = await Order.findById(input.orderId).select('show tierName quantity checkedIn').lean()
  if (!order) return { ok: false, reason: 'not_found' }
  const tickets = legacyCheckedInTickets(order)
  if (!tickets.length) return { ok: false, reason: 'nothing_to_reverse' }

  const before = await Order.findOneAndUpdate(
    { _id: order._id, checkedIn: { $elemMatch: { ticket: { $in: tickets }, admission: null } } },
    { $pull: { checkedIn: { ticket: { $in: tickets }, admission: null } } },
    { returnDocument: 'before', timestamps: false },
  )
    .select('checkedIn')
    .lean()
  const released = before ? legacyCheckedInTickets(before).filter((ticket) => tickets.includes(ticket)) : []
  if (!released.length) return { ok: false, reason: 'nothing_to_reverse' }

  await Admission.create({
    order: order._id,
    show: order.show,
    kind: 'reversal',
    tickets: released,
    quantity: released.length,
    tierName: order.tierName || '',
    usherId: input.usher.id,
    usherName: input.usher.name,
    usherEmail: input.usher.email,
    method: 'search',
    reverses: null,
    reason: input.reason.slice(0, 280),
  })

  return { ok: true, quantity: released.length }
}

/**
 * Find bookings by guest name, email, table or booking reference. With a
 * show selected the whole door list is matched in memory, so accents and
 * word order do not matter; without one the database narrows it first.
 */
export async function searchBookings(input: {
  query: string
  showId: string
}): Promise<{ results: BookingSummary[]; truncated: boolean }> {
  const search = parseDoorSearch(input.query)
  if (!search) return { results: [], truncated: false }

  const filter: Record<string, unknown> = { status: { $in: SEARCH_STATUSES } }
  if (mongoose.isValidObjectId(input.showId)) {
    filter.show = input.showId
  } else {
    filter.stripeSessionId = NOT_SCAN_PRACTICE_SESSION
    const words = search.tokens.map((token) => {
      const rx = new RegExp(escapeRegex(token), 'i')
      return { $or: [{ holderName: rx }, { email: rx }, { tableNames: rx }] }
    })
    const or: Record<string, unknown>[] = [{ $and: words }]
    if (search.ref) {
      or.push({
        $expr: {
          $regexMatch: { input: { $toString: '$_id' }, regex: `${escapeRegex(search.ref)}$`, options: 'i' },
        },
      })
    }
    filter.$or = or
  }

  const fields = 'show email holderName tierName quantity status tableNames voidedTickets checkedIn createdAt'
  const withShow = { path: 'show', populate: { path: 'tour' } }
  const scoped = mongoose.isValidObjectId(input.showId)
  const orders: DoorOrder[] = await Order.find(filter)
    .select(fields)
    .populate(withShow)
    .sort({ createdAt: 1 })
    .limit(scoped ? 5000 : 300)

  const matched = new Set<string>()
  for (const order of orders) {
    if (orderMatchesDoorSearch(order, search)) matched.add(String(order._id))
  }

  // A booking reference (or a table name) matches one order, but the guest may hold another ticket
  // class for the same show. With a show selected its whole door list is already loaded; without
  // one, fetch those other orders so the row shows the booking the usher is about to open.
  if (!scoped && matched.size) {
    const pairs = new Map<string, { show: string; email: string }>()
    for (const order of orders) {
      if (!matched.has(String(order._id)) || order.status !== 'paid' || !bookingGroupKey(order)) continue
      const show = orderShowId(order)
      if (show) pairs.set(`${show}|${order.email}`, { show, email: String(order.email) })
    }
    if (pairs.size) {
      const siblings: DoorOrder[] = await Order.find({
        status: 'paid',
        stripeSessionId: NOT_SCAN_PRACTICE_SESSION,
        _id: { $nin: orders.map((order) => order._id) },
        $or: [...pairs.values()].slice(0, 50),
      })
        .select(fields)
        .populate(withShow)
        .sort({ createdAt: 1 })
        .limit(200)
      orders.push(...siblings)
      orders.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
    }
  }

  const groups = new Map<string, DoorOrder[]>()
  for (const order of orders) {
    const line = bookingLine(order)
    // A paid order with nothing left on it (all refunded or moved) is only worth
    // showing when it explains why a guest cannot be found.
    const guest = bookingGroupKey(order)
    const key =
      line.state === 'open' && guest
        ? `${orderShowId(order)}|${guest}`
        : `closed|${String(order._id)}`
    const group = groups.get(key)
    if (group) group.push(order)
    else groups.set(key, [order])
  }
  // Keep the bookings where any of the guest's orders matched.
  for (const [key, group] of groups) {
    if (!group.some((order) => matched.has(String(order._id)))) groups.delete(key)
  }

  const openGuests = new Set<string>()
  for (const [key, group] of groups) {
    if (!key.startsWith('closed|')) openGuests.add(`${orderShowId(group[0])}|${bookingGroupKey(group[0])}`)
  }

  const results: BookingSummary[] = []
  for (const [key, group] of groups) {
    // Open the booking on the order that matched, e.g. the one whose reference was typed.
    const anchor = group.find((order) => matched.has(String(order._id))) || group[0]
    if (
      key.startsWith('closed|') &&
      openGuests.has(`${orderShowId(anchor)}|${bookingGroupKey(anchor)}`)
    ) {
      // The same guest has a live booking in the results; the old one is noise at the door.
      continue
    }
    results.push(summarize(anchor, group))
  }

  results.sort(
    (a, b) =>
      Number(b.remaining > 0) - Number(a.remaining > 0) ||
      a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }),
  )
  return {
    results: results.slice(0, MAX_SEARCH_RESULTS),
    truncated: results.length > MAX_SEARCH_RESULTS,
  }
}
