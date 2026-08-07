import type Stripe from 'stripe'
import type { HydratedDocument } from 'mongoose'
import type { OrderDocument } from '@/lib/models/Order'
import Show from '@/lib/models/Show'
import TicketTier from '@/lib/models/TicketTier'
import { maybeMarkShowSoldOut } from '@/lib/tickets/maybeMarkShowSoldOut'

/**
 * Mark a pending order paid and increment show + tier inventory.
 * Safe to call more than once — only acts when status flips to paid.
 */
export async function fulfillPaidOrder(
  order: HydratedDocument<OrderDocument>,
  session: Stripe.Checkout.Session,
): Promise<boolean> {
  if (order.status === 'paid') return false

  order.status = 'paid'
  order.email = session.customer_details?.email || session.customer_email || order.email
  order.stripePaymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || ''
  order.amountTotal = session.amount_total || order.amountTotal
  await order.save()

  await Show.findByIdAndUpdate(order.show, {
    $inc: { ticketsSold: order.quantity },
  })

  if (order.tier) {
    await TicketTier.findByIdAndUpdate(order.tier, {
      $inc: { ticketsSold: order.quantity },
    })
  }

  await maybeMarkShowSoldOut(String(order.show))
  return true
}
