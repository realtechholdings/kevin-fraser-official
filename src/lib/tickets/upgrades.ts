import mongoose from 'mongoose'
import type { HydratedDocument } from 'mongoose'
import Order, { type OrderDocument } from '@/lib/models/Order'
import Show, { type ShowDocument } from '@/lib/models/Show'
import TicketTier, { slugifyTierName } from '@/lib/models/TicketTier'
import type { PublicTicketTier } from '@/lib/serialize'
import { resolveTiersForShow } from '@/lib/tickets/resolveTiers'
import { isTierSoldOut } from '@/lib/tickets/soldOut'
import { isTableOffering } from '@/lib/tickets/tables'
import { ensureShowScopedTierId } from '@/lib/tickets/applyTierConfigs'
import { maybeMarkShowSoldOut } from '@/lib/tickets/maybeMarkShowSoldOut'
import { releaseClassInventory } from '@/lib/tickets/fulfillPaidOrder'
import { checkoutReturnUrl, getStripe, stripeRequestOptions } from '@/lib/stripe'
import { stripeShowCopy, stripContactNumbers } from '@/lib/tickets/stripeCopy'

export type UpgradeBlockReason =
  | 'not_paid'
  | 'table'
  | 'checked_in'
  | 'already_upgraded'
  | 'show_unavailable'
  | 'no_class'
  | 'same_class'

export type UpgradeTarget = {
  slug: string
  name: string
  description: string
  currency: string
  unitPriceCents: number
  deltaCents: number
  discountCents: number
  chargeCents: number
  remaining: number | null
  soldOut: boolean
  offered: boolean
}

export type UpgradeQuote = {
  from: { slug: string; name: string; unitPriceCents: number; currency: string }
  quantity: number
  target: UpgradeTarget
}

type ShowWithTour = ShowDocument & { tour?: unknown }

function classTiers(tiers: PublicTicketTier[]) {
  return tiers.filter((t) => !isTableOffering(t) && t.published !== false && t.offered !== false)
}

function paidUnitCents(order: OrderDocument) {
  if (order.quantity > 0 && order.unitAmountCents > 0) return order.unitAmountCents
  if (order.quantity > 0 && order.amountTotal > 0) {
    return Math.round(order.amountTotal / order.quantity)
  }
  return 0
}

export async function orderClassSlug(order: OrderDocument): Promise<string> {
  if (order.tier) {
    const tier = await TicketTier.findById(order.tier)
    if (tier?.slug) return tier.slug
  }
  return slugifyTierName(order.tierName || 'general-admission')
}

export function showAllowsUpgrades(show: Pick<ShowDocument, 'status' | 'date'>) {
  if (show.status === 'cancelled') return false
  if (new Date(show.date).getTime() < Date.now() - 3 * 60 * 60 * 1000) return false
  return true
}

export function upgradeBlockReason(order: OrderDocument): UpgradeBlockReason | null {
  if (order.status === 'upgraded' || order.supersededBy) return 'already_upgraded'
  if (order.status !== 'paid') return 'not_paid'
  if ((order.tableQuantity || 0) > 0 || order.table) return 'table'
  if ((order.checkedIn || []).length > 0) return 'checked_in'
  return null
}

function offerDiscount(
  show: Pick<ShowDocument, 'upgradeOffers'>,
  fromSlug: string,
  toSlug: string,
) {
  const row = (show.upgradeOffers || []).find(
    (o) => o.enabled !== false && o.fromSlug === fromSlug && o.toSlug === toSlug,
  )
  return Math.max(0, Number(row?.discountCents) || 0)
}

function offerEnabled(
  show: Pick<ShowDocument, 'upgradeOffers'>,
  fromSlug: string,
  toSlug: string,
) {
  return (show.upgradeOffers || []).some(
    (o) => o.enabled !== false && o.fromSlug === fromSlug && o.toSlug === toSlug,
  )
}

function remainingOf(tier: PublicTicketTier) {
  if (tier.capacity > 0) return Math.max(0, tier.capacity - tier.ticketsSold)
  return null
}

function toTarget(
  from: PublicTicketTier,
  to: PublicTicketTier,
  order: OrderDocument,
  show: Pick<ShowDocument, 'upgradeOffers'>,
): UpgradeTarget | null {
  if (to.slug === from.slug) return null
  if (to.currency.toUpperCase() !== from.currency.toUpperCase()) return null
  if (to.priceCents <= from.priceCents) return null
  const paidUnit = paidUnitCents(order)
  const baseUnit = paidUnit > 0 ? paidUnit : from.priceCents
  const delta = Math.max(0, to.priceCents - baseUnit)
  const discount = Math.min(delta, offerDiscount(show, from.slug, to.slug))
  const remaining = remainingOf(to)
  return {
    slug: to.slug,
    name: to.name,
    description: to.description || '',
    currency: to.currency,
    unitPriceCents: to.priceCents,
    deltaCents: delta,
    discountCents: discount,
    chargeCents: Math.max(0, delta - discount) * order.quantity,
    remaining,
    soldOut: isTierSoldOut(to),
    offered: to.offered !== false,
  }
}

export async function loadUpgradeContext(order: OrderDocument) {
  const show = await Show.findById(order.show).populate('tour')
  if (!show) return { order, show: null, from: null, tiers: [] as PublicTicketTier[] }
  const tiers = classTiers(await resolveTiersForShow(show))
  const slug = await orderClassSlug(order)
  const from = tiers.find((t) => t.slug === slug) || null
  return { order, show, from, tiers }
}

export function canTakeQuantity(target: UpgradeTarget, quantity: number) {
  if (target.soldOut) return false
  if (target.remaining === null) return true
  return target.remaining >= quantity
}

export async function listUpgradeTargets(
  order: OrderDocument,
  opts?: { publicOnly?: boolean; bypassSoldOut?: boolean },
): Promise<{
  blocked: UpgradeBlockReason | 'show_unavailable' | 'no_class' | null
  show: ShowWithTour | null
  from: PublicTicketTier | null
  targets: UpgradeTarget[]
}> {
  const blocked = upgradeBlockReason(order)
  if (blocked) return { blocked, show: null, from: null, targets: [] }

  const { show, from, tiers } = await loadUpgradeContext(order)
  if (!show) return { blocked: 'show_unavailable', show: null, from: null, targets: [] }
  if (!showAllowsUpgrades(show)) {
    return { blocked: 'show_unavailable', show, from, targets: [] }
  }
  if (!from) return { blocked: 'no_class', show, from: null, targets: [] }

  const targets: UpgradeTarget[] = []
  for (const tier of tiers) {
    const target = toTarget(from, tier, order, show)
    if (!target) continue
    if (opts?.publicOnly && !offerEnabled(show, from.slug, target.slug)) continue
    if (!opts?.bypassSoldOut && !canTakeQuantity(target, order.quantity)) continue
    if (opts?.bypassSoldOut && target.remaining !== null && target.remaining < order.quantity) {
      continue
    }
    targets.push(target)
  }
  targets.sort((a, b) => a.unitPriceCents - b.unitPriceCents)
  return { blocked: null, show, from, targets }
}

export async function quoteUpgrade(
  order: OrderDocument,
  toSlug: string,
  opts?: { publicOnly?: boolean; bypassSoldOut?: boolean },
): Promise<{ quote: UpgradeQuote; show: ShowWithTour } | { error: string; status: number }> {
  const listed = await listUpgradeTargets(order, opts)
  if (listed.blocked) {
    const messages: Record<string, string> = {
      not_paid: 'Only a paid ticket can be upgraded.',
      table: 'Table packages cannot be upgraded.',
      checked_in: 'This ticket has already been scanned and cannot be upgraded.',
      already_upgraded: 'This ticket has already been upgraded.',
      show_unavailable: 'This show is no longer available to upgrade.',
      no_class: 'This order has no ticket class to upgrade from.',
      same_class: 'Pick a higher ticket class.',
    }
    return { error: messages[listed.blocked] || 'This ticket cannot be upgraded.', status: 400 }
  }
  const target = listed.targets.find((t) => t.slug === toSlug)
  if (!target || !listed.from || !listed.show) {
    return { error: 'That upgrade is not available.', status: 400 }
  }
  return {
    quote: {
      from: {
        slug: listed.from.slug,
        name: listed.from.name,
        unitPriceCents: listed.from.priceCents,
        currency: listed.from.currency,
      },
      quantity: order.quantity,
      target,
    },
    show: listed.show,
  }
}

async function cancelPendingUpgradesFrom(orderId: mongoose.Types.ObjectId) {
  await Order.updateMany(
    { upgradedFrom: orderId, status: 'pending' },
    { $set: { status: 'cancelled' } },
  )
}

async function moveClassInventory(
  fromOrder: OrderDocument,
  toTierId: mongoose.Types.ObjectId | null,
  quantity: number,
  showId: mongoose.Types.ObjectId,
) {
  await releaseClassInventory(fromOrder)
  if (toTierId) {
    await TicketTier.findByIdAndUpdate(toTierId, { $inc: { ticketsSold: quantity } })
  }
  await maybeMarkShowSoldOut(String(showId))
}

/**
 * Replace a paid order with a new paid class. Old QR stops working.
 * Caller is responsible for creating `next` as pending (or passing a new doc).
 */
export async function completeUpgradeOrder(
  original: HydratedDocument<OrderDocument>,
  next: HydratedDocument<OrderDocument>,
  session?: import('stripe').Stripe.Checkout.Session | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (next.status === 'paid' && original.status === 'upgraded') {
    return { ok: true }
  }

  const claimed = await Order.findOneAndUpdate(
    { _id: original._id, status: 'paid', supersededBy: null },
    { $set: { status: 'upgraded', supersededBy: next._id } },
    { new: true },
  )
  if (!claimed) {
    if (next.status !== 'paid') {
      next.status = 'cancelled'
      await next.save()
    }
    return { ok: false, error: 'This ticket has already been upgraded.' }
  }

  next.status = 'paid'
  if (session) {
    next.email = session.customer_details?.email || session.customer_email || next.email
    next.stripePaymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || next.stripePaymentIntentId
    next.amountTotal = session.amount_total || next.amountTotal
  }
  await next.save()

  await moveClassInventory(
    claimed,
    next.tier ?? null,
    next.quantity,
    next.show as mongoose.Types.ObjectId,
  )
  return { ok: true }
}

export async function fulfillUpgradeOrder(
  order: HydratedDocument<OrderDocument>,
  session: import('stripe').Stripe.Checkout.Session,
): Promise<boolean> {
  if (order.status === 'paid') return false
  if (!order.upgradedFrom) return false

  const original = await Order.findById(order.upgradedFrom)
  if (!original) {
    order.status = 'cancelled'
    await order.save()
    return false
  }

  const result = await completeUpgradeOrder(original, order, session)
  return result.ok
}

export async function createPaidUpgradeOrder(opts: {
  original: HydratedDocument<OrderDocument>
  show: ShowWithTour
  target: UpgradeTarget
  chargeCents: number
  source: 'stripe' | 'manual'
  issuedBy?: string
  note?: string
  stripeSessionId: string
  status: 'pending' | 'paid'
}) {
  const tiers = classTiers(await resolveTiersForShow(opts.show))
  const selected = tiers.find((t) => t.slug === opts.target.slug)
  if (!selected) throw new Error('Upgrade class is no longer available.')

  const showId = String(opts.show._id)
  const tierId = await ensureShowScopedTierId(showId, selected)
  const next = await Order.create({
    show: opts.show._id,
    tier: tierId,
    tierName: selected.name,
    unitAmountCents: selected.priceCents,
    stripeSessionId: opts.stripeSessionId,
    email: opts.original.email,
    holderName: opts.original.holderName || '',
    quantity: opts.original.quantity,
    amountTotal: opts.chargeCents,
    currency: selected.currency,
    status: opts.status,
    source: opts.source,
    issuedBy: opts.issuedBy || '',
    note: opts.note || '',
    upgradedFrom: opts.original._id,
  })
  return next
}

export async function startUpgradeCheckout(opts: {
  original: HydratedDocument<OrderDocument>
  show: ShowWithTour
  quote: UpgradeQuote
  req: { headers: Headers; nextUrl?: URL }
  issuedBy?: string
  note?: string
  cancelUrl?: string
}): Promise<{ url: string; sessionId: string } | { completedOrderId: string }> {
  await cancelPendingUpgradesFrom(opts.original._id)

  if (opts.quote.target.chargeCents <= 0) {
    const next = await createPaidUpgradeOrder({
      original: opts.original,
      show: opts.show,
      target: opts.quote.target,
      chargeCents: 0,
      source: 'manual',
      issuedBy: opts.issuedBy || '',
      note: opts.note || 'Complimentary / zero-balance upgrade',
      stripeSessionId: `upgrade_${opts.original._id}_${Date.now()}`,
      status: 'pending',
    })
    const result = await completeUpgradeOrder(opts.original, next, null)
    if (!result.ok) throw new Error(result.error)
    return { completedOrderId: String(next._id) }
  }

  const copy = stripeShowCopy(opts.show)
  const fromName = stripContactNumbers(opts.quote.from.name)
  const toName = stripContactNumbers(opts.quote.target.name)
  const upgradeName = `Upgrade to ${toName} — ${copy.tourTitle} · ${copy.city}`

  const stripe = getStripe()
  const returnBase = checkoutReturnUrl(opts.req)
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      adaptive_pricing: { enabled: true },
      success_url: `${returnBase}/worlds/stage/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        opts.cancelUrl ||
        `${returnBase}/worlds/stage/upgrade?order=${opts.original._id}&cancelled=1`,
      customer_email: opts.original.email,
      payment_intent_data: {
        description: upgradeName,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: opts.quote.target.currency.toLowerCase(),
            unit_amount: opts.quote.target.chargeCents,
            product_data: {
              name: upgradeName,
              description: `Replaces ${opts.quote.quantity} × ${fromName} · ${copy.lineDescription}`,
            },
          },
        },
      ],
      metadata: {
        kind: 'upgrade',
        showId: String(opts.show._id),
        upgradeFromOrderId: String(opts.original._id),
        toSlug: opts.quote.target.slug,
        tierName: opts.quote.target.name,
        quantity: String(opts.quote.quantity),
        email: opts.original.email,
      },
    },
    stripeRequestOptions(),
  )

  await createPaidUpgradeOrder({
    original: opts.original,
    show: opts.show,
    target: opts.quote.target,
    chargeCents: opts.quote.target.chargeCents,
    source: 'stripe',
    issuedBy: opts.issuedBy || '',
    note: opts.note || '',
    stripeSessionId: session.id,
    status: 'pending',
  })

  if (!session.url) throw new Error('Stripe did not return a checkout URL.')
  return { url: session.url, sessionId: session.id }
}

export function parseUpgradeOfferRows(raw: unknown) {
  if (!Array.isArray(raw)) return null
  const rows: {
    fromSlug: string
    toSlug: string
    enabled: boolean
    discountCents: number
  }[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as {
      fromSlug?: string
      toSlug?: string
      enabled?: boolean
      discountCents?: number
    }
    const fromSlug = String(row.fromSlug || '').trim().toLowerCase()
    const toSlug = String(row.toSlug || '').trim().toLowerCase()
    if (!fromSlug || !toSlug || fromSlug === toSlug) continue
    if (row.enabled === false) continue
    const key = `${fromSlug}->${toSlug}`
    if (seen.has(key)) continue
    seen.add(key)
    rows.push({
      fromSlug,
      toSlug,
      enabled: true,
      discountCents: Math.max(0, Number(row.discountCents) || 0),
    })
  }
  return rows
}

export function serializeUpgradeTarget(target: UpgradeTarget) {
  return {
    slug: target.slug,
    name: target.name,
    description: target.description,
    currency: target.currency,
    unitPriceCents: target.unitPriceCents,
    deltaCents: target.deltaCents,
    discountCents: target.discountCents,
    chargeCents: target.chargeCents,
    remaining: target.remaining,
  }
}
