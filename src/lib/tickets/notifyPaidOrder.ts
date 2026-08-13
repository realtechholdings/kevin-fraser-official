import type { HydratedDocument } from 'mongoose'
import type { OrderDocument } from '@/lib/models/Order'
import Show from '@/lib/models/Show'
import '@/lib/models/Tour'
import { emailConfigured } from '@/lib/email/resend'
import { sendTicketEmail } from '@/lib/email/ticket'
import { sendSalesOrderNotification } from '@/lib/email/salesNotify'

/**
 * After a paid order: email tickets to the buyer and notify accounts@.
 * Safe to call repeatedly — each message is sent at most once.
 */
export async function notifyPaidOrderEmails(
  order: HydratedDocument<OrderDocument>,
  opts?: { host?: string },
) {
  if (!emailConfigured()) {
    return { ticketSent: false, salesSent: false }
  }

  const show = await Show.findById(order.show).populate('tour')
  if (!show) return { ticketSent: false, salesSent: false }

  let ticketSent = false
  let salesSent = false
  let dirty = false

  if (!order.confirmationEmailSentAt) {
    try {
      const sent = await sendTicketEmail(order, show)
      if (!sent.skipped) {
        order.confirmationEmailSentAt = new Date()
        ticketSent = true
        dirty = true
      }
    } catch (error) {
      console.error('Ticket email failed:', error)
    }
  }

  if (!order.salesNotifyEmailSentAt) {
    try {
      const sent = await sendSalesOrderNotification(order, show, { host: opts?.host })
      if (!sent.skipped) {
        order.salesNotifyEmailSentAt = new Date()
        salesSent = true
        dirty = true
      }
    } catch (error) {
      console.error('Sales notify email failed:', error)
    }
  }

  if (dirty) await order.save()
  return { ticketSent, salesSent }
}
