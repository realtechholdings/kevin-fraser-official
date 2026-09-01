import type { HydratedDocument } from 'mongoose'
import type { OrderDocument } from '@/lib/models/Order'
import Show from '@/lib/models/Show'
import TicketTier from '@/lib/models/TicketTier'
import TicketTable from '@/lib/models/TicketTable'
import { maybeMarkShowSoldOut } from '@/lib/tickets/maybeMarkShowSoldOut'
import { nextTableNames } from '@/lib/tickets/tables'

type InventoryOrder = Pick<
  OrderDocument,
  'show' | 'tier' | 'quantity' | 'table' | 'tableQuantity' | 'tableNames'
> & { save?: () => Promise<unknown> }

/** Increment show + tier + table inventory for a paid order (Stripe or manual). */
export async function applyPaidInventory(order: InventoryOrder): Promise<void> {
  await Show.findByIdAndUpdate(order.show, {
    $inc: { ticketsSold: order.quantity },
  })

  if (order.tier) {
    await TicketTier.findByIdAndUpdate(order.tier, {
      $inc: { ticketsSold: order.quantity },
    })
  }

  const tableQty = Number(order.tableQuantity) || 0
  if (order.table && tableQty > 0) {
    const previous = await TicketTable.findOneAndUpdate(
      { _id: order.table },
      { $inc: { tablesSold: tableQty } },
      { new: false },
    )
    if (previous && !(order.tableNames && order.tableNames.length)) {
      order.tableNames = nextTableNames(previous, previous.tablesSold, tableQty)
      if (typeof order.save === 'function') await order.save()
    }
  }

  await maybeMarkShowSoldOut(String(order.show))
}

/**
 * Mark a pending order paid and increment inventory.
 * Safe to call more than once — only acts when status flips to paid.
 */
export async function fulfillPaidOrder(
  order: HydratedDocument<OrderDocument>,
  session: import('stripe').Stripe.Checkout.Session,
): Promise<boolean> {
  if (order.status === 'paid') return false

  order.status = 'paid'
  order.source = order.source || 'stripe'
  order.email = session.customer_details?.email || session.customer_email || order.email
  order.stripePaymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || ''
  order.amountTotal = session.amount_total || order.amountTotal
  await order.save()

  await applyPaidInventory(order)
  return true
}
