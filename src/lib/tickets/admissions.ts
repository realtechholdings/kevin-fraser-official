import { liveTicketNumbers } from './ticketNumbers'

/**
 * Door admissions, kept apart from the sale.
 *
 * A booking is what one guest holds for one show. Each ticket class on it is
 * a line with its own allocation: purchased, admitted, remaining. Any QR code
 * from a line opens that line, and the usher admits however many have arrived.
 */

export type CheckedInRow = {
  ticket?: number | null
  at?: Date | string | null
  /** Ledger entry that let this ticket in. Missing on check-ins made before the ledger. */
  admission?: unknown
}

export type AdmissionOrder = {
  _id: unknown
  email?: string | null
  holderName?: string | null
  tierName?: string | null
  quantity: number
  status?: string | null
  tableNames?: string[] | null
  voidedTickets?: { ticket?: number | null; reason?: string | null }[] | null
  checkedIn?: CheckedInRow[] | null
}

export type LineState = 'open' | 'not_paid' | 'refunded' | 'upgraded' | 'transferred'

export type BookingLine = {
  orderId: string
  /** Last 8 characters of the order ID, as on the ticket file name. */
  ref: string
  tierName: string
  tableName: string
  purchased: number
  admitted: number
  remaining: number
  state: LineState
}

export type HistoryEntry = {
  id: string
  orderId: string
  kind: 'admit' | 'reversal'
  quantity: number
  tierName: string
  usherName: string
  at: string | null
  method: 'scan' | 'search' | ''
  /** Checked in before admission history existed, so no usher is on record. */
  legacy: boolean
  reversed: { by: string; at: string | null; reason: string } | null
}

export type BookingShow = { id: string; city: string; venue: string; date: string; tour: string }

export type BookingSummary = {
  /** Order used to open the booking again. */
  anchorOrderId: string
  name: string
  email: string
  show: BookingShow | null
  lines: BookingLine[]
  purchased: number
  admitted: number
  remaining: number
}

export type Booking = BookingSummary & { history: HistoryEntry[] }

export type LedgerRecord = {
  id: string
  orderId: string
  kind: 'admit' | 'reversal'
  quantity: number
  tierName: string
  usherName: string
  method?: string | null
  at: Date | string | null
  /** For a reversal: id of the admission it cancels, or null for a pre-ledger check-in. */
  reverses: string | null
  reason?: string | null
}

export const DEFAULT_TIER_NAME = 'General Admission'

function ticketNumber(value: unknown) {
  const ticket = Number(value)
  return Number.isInteger(ticket) && ticket > 0 ? ticket : 0
}

function toIso(value: Date | string | null | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/**
 * Read what the camera saw. Ticket PDFs encode {"order":"…","ticket":1,"of":2};
 * a bare order ID is accepted too. Null when it is not one of our codes.
 */
export function parseScanCode(code: unknown): { orderId: string; ticket: number | null } | null {
  const raw = typeof code === 'string' ? code.trim() : ''
  if (!raw) return null
  if (/^[a-f0-9]{24}$/i.test(raw)) return { orderId: raw.toLowerCase(), ticket: null }
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.order !== 'string' || !/^[a-f0-9]{24}$/i.test(parsed.order)) {
      return null
    }
    const hasTicket = parsed.ticket !== undefined && parsed.ticket !== null
    // A ticket number that is present but unreadable stays invalid rather than becoming "any".
    return {
      orderId: parsed.order.toLowerCase(),
      ticket: hasTicket ? (ticketNumber(parsed.ticket) || -1) : null,
    }
  } catch {
    return null
  }
}

/**
 * Where an order stands at the door. Refunded, upgraded and transferred
 * tickets are not part of the allocation; a ticket scanned twice counts once.
 */
export function admissionCounts(order: AdmissionOrder) {
  const live = liveTicketNumbers(order)
  const liveSet = new Set(live)
  const admittedSet = new Set<number>()
  for (const row of order.checkedIn || []) {
    const ticket = ticketNumber(row?.ticket)
    if (liveSet.has(ticket)) admittedSet.add(ticket)
  }
  const open = live.filter((ticket) => !admittedSet.has(ticket))
  return {
    purchased: live.length,
    admitted: admittedSet.size,
    remaining: open.length,
    /** Ticket numbers still to come through the door, lowest first. */
    open,
  }
}

/**
 * Which ticket numbers an admission uses. The scanned ticket goes first when
 * it is still open, then the lowest numbers, so partial refunds (which take
 * the highest) and partial admissions do not compete for the same tickets.
 */
export function pickAdmitTickets(open: number[], count: number, prefer?: number | null) {
  const wanted = Math.max(0, Math.floor(count))
  const pool = [...new Set(open)].sort((a, b) => a - b)
  if (wanted > pool.length) return []
  const picked: number[] = []
  if (prefer && pool.includes(prefer) && wanted > 0) picked.push(prefer)
  for (const ticket of pool) {
    if (picked.length >= wanted) break
    if (!picked.includes(ticket)) picked.push(ticket)
  }
  return picked.sort((a, b) => a - b)
}

export function lineState(order: AdmissionOrder): LineState {
  const status = String(order.status || '')
  if (status === 'refunded' || status === 'upgraded' || status === 'transferred') return status
  if (status !== 'paid') return 'not_paid'
  if (liveTicketNumbers(order).length > 0) return 'open'
  // Paid, but every ticket has since been refunded, upgraded or moved.
  const reasons = (order.voidedTickets || []).map((row) => String(row?.reason || ''))
  const last = reasons[reasons.length - 1]
  return last === 'upgraded' || last === 'transferred' ? last : 'refunded'
}

export function orderRef(orderId: unknown) {
  return String(orderId || '').slice(-8).toUpperCase()
}

export function bookingLine(order: AdmissionOrder): BookingLine {
  const state = lineState(order)
  const counts = admissionCounts(order)
  const closed = state !== 'open'
  return {
    orderId: String(order._id),
    ref: orderRef(order._id),
    tierName: String(order.tierName || '').trim() || DEFAULT_TIER_NAME,
    tableName: (order.tableNames || [])
      .map((name) => String(name || '').trim())
      .filter(Boolean)
      .join(', '),
    purchased: counts.purchased,
    admitted: counts.admitted,
    remaining: closed ? 0 : counts.remaining,
    state,
  }
}

/** Lower-case, accent-free, single-spaced: "José  SMITH" and "jose smith" compare equal. */
export function foldText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function guestDisplayName(order: Pick<AdmissionOrder, 'holderName' | 'email'>) {
  const name = String(order.holderName || '').trim()
  if (name) return name
  const email = String(order.email || '').trim().toLowerCase()
  if (!email || email === 'pending@checkout') return 'Guest'
  return email
}

/**
 * Orders that belong to the same guest at one show share a key, so a booking
 * with two ticket classes opens as one booking with a line for each. The name
 * is part of the key because comps for different guests are often issued
 * under one staff email. Null means the order always stands alone.
 */
export function bookingGroupKey(order: Pick<AdmissionOrder, 'holderName' | 'email'>) {
  const email = foldText(order.email)
  if (!email || email === 'pending@checkout') return null
  return `${email}|${foldText(order.holderName)}`
}

export type DoorSearch = { tokens: string[]; ref: string }

/** At least two characters, so one keystroke cannot list the whole door. */
export function parseDoorSearch(raw: string): DoorSearch | null {
  const text = foldText(raw).replace(/^#/, '')
  if (text.length < 2) return null
  const compact = text.replace(/\s+/g, '')
  return {
    tokens: text.split(' ').filter(Boolean),
    ref: /^[a-f0-9]{6,24}$/.test(compact) ? compact : '',
  }
}

/**
 * Name, email or table: every word typed must appear. Booking reference: the
 * full order ID from the ticket footer, or its last six or more characters.
 */
export function orderMatchesDoorSearch(order: AdmissionOrder, search: DoorSearch) {
  if (search.ref && String(order._id).toLowerCase().endsWith(search.ref)) return true
  const haystack = foldText(
    [order.holderName, order.email, ...(order.tableNames || [])].filter(Boolean).join(' '),
  )
  return search.tokens.length > 0 && search.tokens.every((token) => haystack.includes(token))
}

/**
 * Admission history for a booking, newest first. A reversal is shown on the
 * admission it cancelled. Check-ins from before the ledger have no usher on
 * record and appear as one entry per order.
 */
export function buildAdmissionHistory(
  orders: AdmissionOrder[],
  records: LedgerRecord[],
): HistoryEntry[] {
  const reversalOf = new Map<string, LedgerRecord>()
  for (const record of records) {
    if (record.kind === 'reversal' && record.reverses) reversalOf.set(record.reverses, record)
  }

  const entries: HistoryEntry[] = []
  for (const record of records) {
    if (record.kind === 'reversal' && record.reverses) continue
    const reversal = record.kind === 'admit' ? reversalOf.get(record.id) : undefined
    entries.push({
      id: record.id,
      orderId: record.orderId,
      kind: record.kind,
      quantity: record.quantity,
      tierName: record.tierName || DEFAULT_TIER_NAME,
      usherName: record.usherName || 'Unknown',
      at: toIso(record.at),
      method: record.method === 'scan' || record.method === 'search' ? record.method : '',
      legacy: false,
      reversed: reversal
        ? {
            by: reversal.usherName || 'Unknown',
            at: toIso(reversal.at),
            reason: String(reversal.reason || '').trim(),
          }
        : null,
    })
  }

  for (const order of orders) {
    const live = new Set(liveTicketNumbers(order))
    const seen = new Set<number>()
    let latest: string | null = null
    for (const row of order.checkedIn || []) {
      const ticket = ticketNumber(row?.ticket)
      if (row?.admission || !live.has(ticket) || seen.has(ticket)) continue
      seen.add(ticket)
      const at = toIso(row?.at)
      if (at && (!latest || at > latest)) latest = at
    }
    if (!seen.size) continue
    entries.push({
      id: `legacy:${String(order._id)}`,
      orderId: String(order._id),
      kind: 'admit',
      quantity: seen.size,
      tierName: String(order.tierName || '').trim() || DEFAULT_TIER_NAME,
      usherName: '',
      at: latest,
      method: '',
      legacy: true,
      reversed: null,
    })
  }

  return entries.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
}

/** Ticket numbers on an order that were checked in before the ledger existed. */
export function legacyCheckedInTickets(order: AdmissionOrder) {
  const tickets = new Set<number>()
  for (const row of order.checkedIn || []) {
    const ticket = ticketNumber(row?.ticket)
    if (ticket && !row?.admission) tickets.add(ticket)
  }
  return [...tickets].sort((a, b) => a - b)
}

/** Keep a stepper inside what the line can still admit. */
export function clampAdmitQuantity(value: number, remaining: number) {
  const max = Math.max(0, Math.floor(remaining))
  const wanted = Math.floor(Number(value) || 0)
  return Math.max(0, Math.min(max, wanted))
}
