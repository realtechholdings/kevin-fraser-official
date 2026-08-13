import type { OrderDocument } from '@/lib/models/Order'
import type { ShowDocument } from '@/lib/models/Show'
import type { TourDocument } from '@/lib/models/Tour'
import { formatPrice, formatShowDate, formatShowTimeRange } from '@/lib/format'
import { toWallIso } from '@/lib/wallDate'
import { appUrl } from '@/lib/stripe'
import { renderEmailHtml, textToEmailHtml } from '@/lib/email/branding'
import {
  SALES_NOTIFY_TO,
  emailConfigured,
  salesFromAddress,
  sendEmail,
} from '@/lib/email/resend'

function tourTitleOf(show: ShowDocument & { tour?: TourDocument | unknown }) {
  return show.tour && typeof show.tour === 'object' && 'title' in show.tour
    ? String((show.tour as { title: unknown }).title)
    : ''
}

export type SalesOrderLike = Pick<
  OrderDocument,
  'email' | 'quantity' | 'amountTotal' | 'currency' | 'tierName' | 'stripeSessionId'
> & { _id: unknown }

/** Notify accounts@ of a successful ticket purchase. */
export async function sendSalesOrderNotification(
  order: SalesOrderLike,
  show: ShowDocument & { tour?: TourDocument | unknown },
  opts?: { host?: string },
) {
  if (!emailConfigured()) return { skipped: true as const, reason: 'not_configured' as const }

  const tourTitle = tourTitleOf(show)
  const date = formatShowDate(toWallIso(show.date) || String(show.date)).full
  const time = formatShowTimeRange(show.showTime, show.showEndTime) || ''
  const total = formatPrice(order.amountTotal, order.currency)
  const orderId = String(order._id)
  const host = opts?.host || ''
  const from = salesFromAddress(host)
  const site = host || appUrl().replace(/^https?:\/\//, '')

  const subject = `New ticket order — ${tourTitle || show.title} · ${show.city}`
  const text = [
    'A new ticket purchase was completed.',
    '',
    `Order: ${orderId}`,
    `Buyer: ${order.email}`,
    `Show: ${tourTitle || show.title}`,
    `City: ${show.city}`,
    `Venue: ${show.venue}`,
    `Date: ${date}${time ? ` · ${time}` : ''}`,
    `Tier: ${order.tierName || 'General Admission'}`,
    `Quantity: ${order.quantity}`,
    `Total: ${total}`,
    `Stripe session: ${order.stripeSessionId}`,
    `Site: ${site}`,
  ].join('\n')

  const html = renderEmailHtml({
    bodyHtml: textToEmailHtml(text),
    appUrl: appUrl(),
  })

  const result = await sendEmail({
    to: [SALES_NOTIFY_TO],
    from,
    subject,
    text,
    html,
    replyTo: order.email,
  })

  return { skipped: false as const, id: result.id, from, to: SALES_NOTIFY_TO }
}
