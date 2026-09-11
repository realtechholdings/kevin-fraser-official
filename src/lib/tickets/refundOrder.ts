import type { HydratedDocument } from 'mongoose'
import Order, { type OrderDocument } from '@/lib/models/Order'
import Show from '@/lib/models/Show'
import { getStripe, stripeRequestOptions } from '@/lib/stripe'
import { releasePaidInventory } from '@/lib/tickets/fulfillPaidOrder'

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

async function refundStripePaymentIntent(paymentIntentId: string) {
  const stripe = getStripe()
  const opts = stripeRequestOptions()
  try {
    const refund = await stripe.refunds.create(
      { payment_intent: paymentIntentId, reason: 'requested_by_customer' },
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

async function refundStripeIfNeeded(order: Pick<OrderDocument, 'source' | 'stripePaymentIntentId' | 'amountTotal'>) {
  if ((order.source || 'stripe') === 'manual') {
    return { skipped: true as const, id: '' }
  }
  const pi = String(order.stripePaymentIntentId || '').trim()
  if (!pi || !(Number(order.amountTotal) > 0)) {
    return { skipped: true as const, id: '' }
  }
  const refunded = await refundStripePaymentIntent(pi)
  return { skipped: false as const, id: refunded.id }
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

  await releasePaidInventory(claimed)
  return { ok: true as const, already: false as const, order: claimed }
}

export async function showForOrder(order: OrderDocument) {
  const showId = order.show
  if (!showId) return null
  return Show.findById(showId).populate('tour')
}
