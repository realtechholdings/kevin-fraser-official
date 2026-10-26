import mongoose from 'mongoose'
import type { HydratedDocument } from 'mongoose'
import Order, { type OrderDocument } from '@/lib/models/Order'
import Show, { type ShowDocument } from '@/lib/models/Show'
import { isShowArchived } from '@/lib/shows/archive'
import { formatShowDate } from '@/lib/format'
import { toWallIso } from '@/lib/wallDate'
import type { PublicTicketTier } from '@/lib/serialize'
import { resolveTiersForShow } from '@/lib/tickets/resolveTiers'
import { isTableOffering } from '@/lib/tickets/tables'
import { isTierSoldOut, venueCanTake, venueSeatRemaining } from '@/lib/tickets/soldOut'
import { ensureShowScopedTierId } from '@/lib/tickets/applyTierConfigs'
import {
  applyPaidInventory,
  releasePaidInventory,
} from '@/lib/tickets/fulfillPaidOrder'
import { checkoutReturnUrl, getStripe, stripeRequestOptions } from '@/lib/stripe'
import { stripeChargeName, stripeShowCopy, stripContactNumbers } from '@/lib/tickets/stripeCopy'
import {
  centsForTickets,
  liveTicketNumbers,
  pickTicketNumbers,
  refundableTicketNumbers,
} from '@/lib/tickets/ticketNumbers'
import { publicTierDescription } from '@/lib/tickets/tierCopy'

export const TRANSFER_HOLD_MS = 30 * 60 * 1000

type ShowWithTour = ShowDocument & { tour?: unknown }

export type TransferOption = {
  slug: string
  name: string
  description: string
  currency: string
  unitPriceCents: number
  chargeCents: number
  creditCents: number
  remaining: number | null
}

export type TransferShowOption = {
  id: string
  city: string
  venue: string
  dateLabel: string
  options: TransferOption[]
}

function tourIdOf(show: { tour?: unknown }) {
  const tour = show.tour
  if (tour && typeof tour === 'object' && '_id' in tour) return String((tour as { _id: unknown })._id)
  return String(tour || '')
}

function classTiers(tiers: PublicTicketTier[]) {
  return tiers.filter((tier) => !isTableOffering(tier) && tier.published !== false && tier.offered !== false)
}

export function transferBlockReason(order: OrderDocument) {
  if (order.status === 'transferred' || order.status === 'upgraded' || order.supersededBy) {
    return 'These tickets have already moved.'
  }
  if (order.status !== 'paid') return 'Only paid tickets can be transferred.'
  if ((order.tableQuantity || 0) > 0 || order.table) {
    return 'Table bookings can’t be moved online. Email tickets@kevinfraserofficial.com.'
  }
  if (!refundableTicketNumbers(order).length) {
    return liveTicketNumbers(order).length
      ? 'Scanned tickets can’t be transferred.'
      : 'These tickets can no longer be transferred.'
  }
  return ''
}

export async function loadOpenTransferHolds(showIds: string[]) {
  const ids = showIds.filter((id) => mongoose.isValidObjectId(id))
  const byShow = new Map<string, Map<string, number>>()
  if (!ids.length) return byShow
  const since = new Date(Date.now() - TRANSFER_HOLD_MS)
  const rows = await Order.find({
    show: { $in: ids },
    status: 'pending',
    transferFrom: { $ne: null },
    createdAt: { $gte: since },
  }).select('show tier quantity')
  for (const row of rows) {
    const showId = String(row.show)
    const tierId = row.tier ? String(row.tier) : ''
    const map = byShow.get(showId) || new Map<string, number>()
    if (tierId) map.set(tierId, (map.get(tierId) || 0) + (row.quantity || 0))
    byShow.set(showId, map)
  }
  return byShow
}

export function applyTransferHolds(
  tiers: PublicTicketTier[],
  holds: Map<string, number> | undefined,
) {
  let heldSeats = 0
  const next = tiers.map((tier) => {
    const extra = holds?.get(tier.id) || 0
    heldSeats += extra * (tier.kind === 'table' ? Math.max(1, tier.seats || 1) : 1)
    if (!extra) return tier
    return { ...tier, ticketsSold: (tier.ticketsSold || 0) + extra }
  })
  return { tiers: next, heldSeats }
}

async function destinationShows(origin: ShowWithTour) {
  const tourId = tourIdOf(origin)
  if (!tourId) return []
  const shows = await Show.find({
    tour: tourId,
    _id: { $ne: origin._id },
    published: true,
    archivedAt: null,
    status: { $in: ['on_sale', 'sold_out'] },
    date: { $gte: new Date(Date.now() - 3 * 60 * 60 * 1000) },
  })
    .populate('tour')
    .sort({ date: 1 })
  return shows.filter((show) => !isShowArchived(show)) as ShowWithTour[]
}

function quoteOption(
  tier: PublicTicketTier,
  quantity: number,
  creditCents: number,
  currency: string,
  venueRemaining: number | null,
  allTiers: PublicTicketTier[],
  showStatus: string,
): TransferOption | null {
  if (tier.currency.toUpperCase() !== currency.toUpperCase()) return null
  if (isTierSoldOut(tier, venueRemaining, allTiers, showStatus)) return null
  const remaining = tier.capacity > 0 ? Math.max(0, tier.capacity - tier.ticketsSold) : null
  if (remaining !== null && remaining < quantity) return null
  const chargeCents = Math.max(0, tier.priceCents * quantity - creditCents)
  return {
    slug: tier.slug,
    name: tier.name,
    description: publicTierDescription(tier.description),
    currency: tier.currency,
    unitPriceCents: tier.priceCents,
    chargeCents,
    creditCents,
    remaining,
  }
}

export async function listTransferShows(
  order: OrderDocument,
  quantity: number,
): Promise<{ error: string; shows: TransferShowOption[] }> {
  const blocked = transferBlockReason(order)
  if (blocked) return { error: blocked, shows: [] }
  const origin = await Show.findById(order.show).populate('tour')
  if (!origin) return { error: 'The original show could not be found.', shows: [] }

  const qty = Math.max(1, Math.min(quantity, refundableTicketNumbers(order).length))
  const picked = pickTicketNumbers(refundableTicketNumbers(order), qty)
  const creditCents = centsForTickets(order.amountTotal, order.quantity, picked)
  const destinations = await destinationShows(origin as ShowWithTour)
  const holds = await loadOpenTransferHolds(destinations.map((show) => String(show._id)))
  const shows: TransferShowOption[] = []

  for (const show of destinations) {
    const resolved = classTiers(await resolveTiersForShow(show))
    const held = applyTransferHolds(resolved, holds.get(String(show._id)))
    const venueRemaining = venueSeatRemaining({
      capacity: show.capacity,
      ticketsSold: (show.ticketsSold || 0) + held.heldSeats,
    })
    const options: TransferOption[] = []
    for (const tier of held.tiers) {
      if (venueRemaining !== null && venueRemaining < qty) continue
      const option = quoteOption(
        tier,
        qty,
        creditCents,
        order.currency,
        venueRemaining,
        held.tiers,
        show.status,
      )
      if (option) options.push(option)
    }
    options.sort((a, b) => a.chargeCents - b.chargeCents || a.unitPriceCents - b.unitPriceCents)
    if (!options.length) continue
    const date = formatShowDate(toWallIso(show.date) || String(show.date))
    shows.push({
      id: String(show._id),
      city: show.city,
      venue: show.venue,
      dateLabel: date.full || '',
      options,
    })
  }

  return { error: '', shows }
}

async function cancelPendingTransfersFrom(orderId: mongoose.Types.ObjectId) {
  await Order.updateMany(
    { transferFrom: orderId, status: 'pending' },
    { $set: { status: 'cancelled' } },
  )
}

export async function completeTransferOrder(
  original: HydratedDocument<OrderDocument>,
  next: HydratedDocument<OrderDocument>,
  session?: import('stripe').Stripe.Checkout.Session | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (next.status === 'paid') return { ok: true }
  const fresh = await Order.findById(original._id)
  if (!fresh || fresh.status !== 'paid' || fresh.supersededBy) {
    next.status = 'cancelled'
    await next.save()
    return { ok: false, error: 'These tickets can no longer be transferred.' }
  }

  const open = refundableTicketNumbers(fresh)
  if (open.length < next.quantity) {
    next.status = 'cancelled'
    await next.save()
    return { ok: false, error: 'Not enough tickets left on the original booking.' }
  }

  const picked = pickTicketNumbers(open, next.quantity)
  const entries = picked.map((ticket) => ({
    ticket,
    reason: 'transferred' as const,
    at: new Date(),
    stripeRefundId: '',
  }))
  const liveAfter = liveTicketNumbers({
    quantity: fresh.quantity,
    voidedTickets: [...(fresh.voidedTickets || []), ...entries],
  })
  const claimed = await Order.findOneAndUpdate(
    { _id: fresh._id, status: 'paid', supersededBy: null },
    liveAfter.length
      ? { $push: { voidedTickets: { $each: entries } } }
      : {
          $set: { status: 'transferred', supersededBy: next._id },
          $push: { voidedTickets: { $each: entries } },
        },
    { new: true },
  )
  if (!claimed) {
    next.status = 'cancelled'
    await next.save()
    return { ok: false, error: 'These tickets have already moved.' }
  }

  next.status = 'paid'
  next.transferCreditCents = centsForTickets(fresh.amountTotal, fresh.quantity, picked)
  if (session) {
    next.email = session.customer_details?.email || session.customer_email || next.email
    next.stripePaymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || next.stripePaymentIntentId
    next.amountTotal = session.amount_total || next.amountTotal
  }
  await next.save()

  await releasePaidInventory(claimed, { quantity: next.quantity })
  await applyPaidInventory(next)
  return { ok: true }
}

export async function fulfillTransferOrder(
  order: HydratedDocument<OrderDocument>,
  session: import('stripe').Stripe.Checkout.Session,
): Promise<boolean> {
  if (order.status === 'paid') return false
  if (!order.transferFrom) return false
  const original = await Order.findById(order.transferFrom)
  if (!original) {
    order.status = 'cancelled'
    await order.save()
    return false
  }
  const result = await completeTransferOrder(original, order, session)
  if (!result.ok && session.payment_intent) {
    try {
      const stripe = getStripe()
      const paymentIntent =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent.id
      if (paymentIntent) {
        await stripe.refunds.create({ payment_intent: paymentIntent }, stripeRequestOptions())
      }
    } catch (error) {
      console.error('Transfer difference refund failed:', error)
    }
  }
  return result.ok
}

export async function startTransfer(opts: {
  original: HydratedDocument<OrderDocument>
  showId: string
  toSlug: string
  quantity: number
  req: { headers: Headers; nextUrl?: URL }
  cancelUrl?: string
}): Promise<{ url: string; sessionId: string } | { completedOrderId: string }> {
  const blocked = transferBlockReason(opts.original)
  if (blocked) throw new Error(blocked)
  const qty = Math.max(
    1,
    Math.min(opts.quantity || refundableTicketNumbers(opts.original).length, refundableTicketNumbers(opts.original).length),
  )
  await cancelPendingTransfersFrom(opts.original._id)

  const listed = await listTransferShows(opts.original, qty)
  if (listed.error) throw new Error(listed.error)
  const showOption = listed.shows.find((show) => show.id === opts.showId)
  const option = showOption?.options.find((row) => row.slug === opts.toSlug)
  if (!showOption || !option) throw new Error('That show or ticket class is no longer available.')

  const destination = await Show.findById(opts.showId).populate('tour')
  if (!destination || isShowArchived(destination)) throw new Error('That show is no longer available.')
  const tiers = classTiers(await resolveTiersForShow(destination))
  const selected = tiers.find((tier) => tier.slug === option.slug)
  if (!selected) throw new Error('That ticket class is no longer available.')
  if (!venueCanTake(destination, qty, 0)) {
    throw new Error('Not enough seats left at that show.')
  }

  const tierId = await ensureShowScopedTierId(String(destination._id), selected)
  const credit = option.creditCents
  const note = `Transfer from ${String((await Show.findById(opts.original.show))?.city || 'another show')}`

  if (option.chargeCents <= 0) {
    const next = await Order.create({
      show: destination._id,
      tier: tierId,
      tierName: selected.name,
      unitAmountCents: selected.priceCents,
      stripeSessionId: `transfer_${opts.original._id}_${Date.now()}`,
      email: opts.original.email,
      holderName: opts.original.holderName || '',
      quantity: qty,
      amountTotal: 0,
      currency: selected.currency,
      status: 'pending',
      source: 'stripe',
      note,
      transferFrom: opts.original._id,
      transferCreditCents: credit,
    })
    const result = await completeTransferOrder(opts.original, next, null)
    if (!result.ok) throw new Error(result.error)
    return { completedOrderId: String(next._id) }
  }

  const copy = stripeShowCopy(destination)
  const className = stripContactNumbers(selected.name)
  const chargeName = stripeChargeName(copy, `Transfer to ${className}`)
  const stripe = getStripe()
  const returnBase = checkoutReturnUrl(opts.req)
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      adaptive_pricing: { enabled: true },
      success_url: `${returnBase}/worlds/stage/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: opts.cancelUrl || `${returnBase}/worlds/stage/transfer?cancelled=1`,
      customer_email: opts.original.email,
      payment_intent_data: { description: chargeName },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: option.currency.toLowerCase(),
            unit_amount: option.chargeCents,
            product_data: {
              name: chargeName,
              description: `Moves ${qty} ticket${qty === 1 ? '' : 's'} · ${copy.lineDescription}`,
            },
          },
        },
      ],
      metadata: {
        kind: 'transfer',
        showId: String(destination._id),
        transferFromOrderId: String(opts.original._id),
        toSlug: option.slug,
        quantity: String(qty),
        email: opts.original.email,
      },
    },
    stripeRequestOptions(),
  )

  await Order.create({
    show: destination._id,
    tier: tierId,
    tierName: selected.name,
    unitAmountCents: selected.priceCents,
    stripeSessionId: session.id,
    email: opts.original.email,
    holderName: opts.original.holderName || '',
    quantity: qty,
    amountTotal: option.chargeCents,
    currency: selected.currency,
    status: 'pending',
    source: 'stripe',
    note,
    transferFrom: opts.original._id,
    transferCreditCents: credit,
  })

  if (!session.url) throw new Error('Stripe did not return a checkout URL.')
  return { url: session.url, sessionId: session.id }
}
