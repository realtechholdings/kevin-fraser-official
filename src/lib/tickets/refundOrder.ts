import type { HydratedDocument } from 'mongoose'
import Order, { type OrderDocument } from '@/lib/models/Order'
import Show from '@/lib/models/Show'
import { getStripe, stripeRequestOptions } from '@/lib/stripe'
import { releasePaidInventory } from '@/lib/tickets/fulfillPaidOrder'
import {
  centsForTickets,
  liveTicketNumbers,
  pickTicketNumbers,
  refundableTicketNumbers,
} from '@/lib/tickets/ticketNumbers'

function stripeErrorCode(error: unknown) {
  if (!error || typeof error !== 'object') return ''
  const record = error as { code?: string; raw?: { code?: string }; message?: string }
  return String(record.code || record.raw?.code || '')
}

function stripeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Stripe refund failed.'
}

function alreadyRefunded(error: unknown) {
  const code = stripeErrorCode(error)
  if (code === 'charge_already_refunded') return true
  return /already been refunded/i.test(stripeErrorMessage(error))
}

async function refundStripePaymentIntent(paymentIntentId: string, amount?: number) {
  const stripe = getStripe()
  const opts = stripeRequestOptions()
  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        reason: 'requested_by_customer',
        ...(amount && amount > 0 ? { amount } : {}),
      },
      opts,
    )
    return { id: refund.id, already: false as const }
  } catch (error) {
    if (alreadyRefunded(error)) {
      const existing = await stripe.refunds.list(
        { payment_intent: paymentIntentId, limit: 1 },
        opts,
      )
      return { id: existing.data[0]?.id || '', already: true as const }
    }
    throw error
  }
}

async function refundStripeIfNeeded(
  order: Pick<OrderDocument, 'source' | 'stripePaymentIntentId' | 'amountTotal'>,
  amount?: number,
) {
  if ((order.source || 'stripe') === 'manual') {
    return { skipped: true as const, id: '' }
  }
  const pi = String(order.stripePaymentIntentId || '').trim()
  if (!pi || !(Number(order.amountTotal) > 0)) {
    return { skipped: true as const, id: '' }
  }
  if (amount === 0) return { skipped: true as const, id: '' }
  const refunded = await refundStripePaymentIntent(pi, amount)
  return { skipped: false as const, id: refunded.id }
}

/**
 * Refund some tickets on a paid order. Remaining ticket numbers keep scanning.
 * Table packages stay all-or-nothing — use a full refund for those.
 */
export async function refundOrderTickets(
  order: HydratedDocument<OrderDocument>,
  count: number,
  opts?: { refundedBy?: string },
) {
  if (order.status !== 'paid') {
    return {
      ok: false as const,
      status: 400,
      error:
        order.status === 'upgraded'
          ? 'This order was upgraded. Refund the replacement tickets instead.'
          : 'Only paid orders can be refunded.',
    }
  }
  if ((order.tableQuantity || 0) > 0 || order.table) {
    return {
      ok: false as const,
      status: 400,
      error: 'Refund a table booking in full. Individual table seats can’t be split.',
    }
  }

  const open = refundableTicketNumbers(order)
  const tickets = Math.floor(count)
  if (tickets < 1 || tickets > open.length) {
    return {
      ok: false as const,
      status: 400,
      error: open.length
        ? `Choose between 1 and ${open.length} ticket${open.length === 1 ? '' : 's'}. Scanned tickets can’t be refunded.`
        : 'Every remaining ticket on this order has already been scanned.',
    }
  }

  const picked = pickTicketNumbers(open, tickets)
  const cents = centsForTickets(order.amountTotal, order.quantity, picked)
  let stripeRefundId = ''
  try {
    const primary = await refundStripeIfNeeded(order, cents)
    stripeRefundId = primary.id
  } catch (error) {
    return { ok: false as const, status: 502, error: stripeErrorMessage(error) }
  }

  const original = order.upgradedFrom ? await Order.findById(order.upgradedFrom) : null
  const liveAfter = liveTicketNumbers({
    quantity: order.quantity,
    voidedTickets: [...(order.voidedTickets || []), ...picked.map((ticket) => ({ ticket }))],
  })
  if (original && Number(original.amountTotal) > 0) {
    const already = Math.max(0, Number(original.refundedCents) || 0)
    const remainingCents = Math.max(0, original.amountTotal - already)
    const originalLive = liveTicketNumbers(original).length
    const share =
      liveAfter.length === 0 && originalLive === 0
        ? remainingCents
        : Math.min(
            remainingCents,
            Math.round((original.amountTotal * picked.length) / original.quantity),
          )
    try {
      const originalRefund = await refundStripeIfNeeded(original, share)
      original.refundedCents = already + share
      if (originalRefund.id) original.stripeRefundId = originalRefund.id
      await original.save()
    } catch (error) {
      return {
        ok: false as const,
        status: 502,
        error: `These tickets were refunded, but the original purchase failed: ${stripeErrorMessage(error)}`,
      }
    }
  }

  const entries = picked.map((ticket) => ({
    ticket,
    reason: 'refunded' as const,
    at: new Date(),
    stripeRefundId,
  }))
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, status: 'paid' },
    {
      $push: { voidedTickets: { $each: entries } },
      $inc: { refundedCents: cents },
      ...(liveAfter.length
        ? {}
        : {
            $set: {
              status: 'refunded',
              refundedAt: new Date(),
              refundedBy: opts?.refundedBy || '',
              stripeRefundId,
            },
          }),
    },
    { new: true },
  )
  if (!claimed) {
    return { ok: false as const, status: 409, error: 'This order can no longer be refunded.' }
  }
  if (claimed.inventoryCounted !== false) {
    await releasePaidInventory(claimed, { quantity: picked.length })
  }
  return {
    ok: true as const,
    already: false as const,
    partial: liveAfter.length > 0,
    quantity: picked.length,
    amountCents: cents,
    order: claimed,
  }
}

export async function refundPaidOrder(
  order: HydratedDocument<OrderDocument>,
  opts?: { refundedBy?: string },
) {
  if (order.status === 'refunded') {
    return { ok: true as const, already: true as const, order }
  }
  if (order.status !== 'paid') {
    return {
      ok: false as const,
      status: 400,
      error:
        order.status === 'upgraded'
          ? 'This order was upgraded. Refund the replacement tickets instead.'
          : 'Only paid orders can be refunded.',
    }
  }

  let stripeRefundId = ''
  try {
    const primary = await refundStripeIfNeeded(order)
    stripeRefundId = primary.id
  } catch (error) {
    return { ok: false as const, status: 502, error: stripeErrorMessage(error) }
  }

  const original =
    order.upgradedFrom ? await Order.findById(order.upgradedFrom) : null
  if (original && original.status === 'upgraded') {
    try {
      const originalRefund = await refundStripeIfNeeded(original)
      original.status = 'refunded'
      original.refundedAt = new Date()
      original.refundedBy = opts?.refundedBy || original.refundedBy || ''
      original.stripeRefundId = originalRefund.id || original.stripeRefundId || ''
      await original.save()
    } catch (error) {
      return {
        ok: false as const,
        status: 502,
        error: `Upgrade charge was refunded, but the original purchase failed: ${stripeErrorMessage(error)}`,
      }
    }
  }

  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, status: 'paid' },
    {
      $set: {
        status: 'refunded',
        refundedAt: new Date(),
        refundedBy: opts?.refundedBy || '',
        stripeRefundId,
      },
    },
    { new: true },
  )

  if (!claimed) {
    const latest = await Order.findById(order._id)
    if (latest?.status === 'refunded') {
      return { ok: true as const, already: true as const, order: latest }
    }
    return { ok: false as const, status: 409, error: 'This order can no longer be refunded.' }
  }

  await Order.updateMany(
    { upgradedFrom: claimed._id, status: 'pending' },
    { $set: { status: 'cancelled' } },
  )

  if (claimed.inventoryCounted !== false) {
    await releasePaidInventory(claimed)
  }
  return { ok: true as const, already: false as const, order: claimed }
}

/** A manual issue with nothing charged — reversing it is a void, not a refund. */
export function isCompOrder(
  order: Pick<OrderDocument, 'source' | 'amountTotal' | 'upgradedFrom'>,
) {
  return (
    (order.source || 'stripe') === 'manual' &&
    !(Number(order.amountTotal) > 0) &&
    !order.upgradedFrom
  )
}

/**
 * Undo a complimentary / manual issue: tickets stop scanning and any
 * seats or tables it took go back on sale. Never touches Stripe.
 */
export async function voidCompOrder(
  order: HydratedDocument<OrderDocument>,
  opts?: { voidedBy?: string },
) {
  if (!isCompOrder(order)) {
    return {
      ok: false as const,
      status: 400,
      error: 'Only complimentary / manual tickets can be voided. Use Refund for paid orders.',
    }
  }
  return refundPaidOrder(order, { refundedBy: opts?.voidedBy })
}

export async function showForOrder(order: OrderDocument) {
  const showId = order.show
  if (!showId) return null
  return Show.findById(showId).populate('tour')
}
