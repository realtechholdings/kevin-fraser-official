import type { OrderDocument } from '@/lib/models/Order'
import type { ShowDocument } from '@/lib/models/Show'
import type { TourDocument } from '@/lib/models/Tour'
import { getEmailSettings } from '@/lib/models/EmailSettings'
import { formatPrice, formatShowDate, formatShowTimeRange } from '@/lib/format'
import { toWallIso } from '@/lib/wallDate'
import { appUrl } from '@/lib/stripe'
import { renderEmailHtml, substituteTemplate, textToEmailHtml } from '@/lib/email/branding'
import { sendEmail } from '@/lib/email/resend'
import { generateTicketsPdf } from '@/lib/email/ticketPdf'
import { createR2DownloadUrl, publicUrlForKey } from '@/lib/r2'

function tourOf(show: ShowDocument & { tour?: TourDocument | unknown }) {
  const tour = show.tour
  if (!tour || typeof tour !== 'object' || !('title' in tour)) return null
  return tour as unknown as TourDocument
}

function tourTitleOf(show: ShowDocument & { tour?: TourDocument | unknown }) {
  const tour = tourOf(show)
  return tour?.title ? String(tour.title) : ''
}

export type TicketOrderLike = Pick<
  OrderDocument,
  'email' | 'quantity' | 'amountTotal' | 'currency' | 'tierName'
> & { _id: unknown }

export function ticketTemplateVars(
  show: ShowDocument & { tour?: TourDocument | unknown },
  order: TicketOrderLike,
) {
  const d = formatShowDate(toWallIso(show.date) || String(show.date))
  const tourTitle = tourTitleOf(show)
  return {
    name: order.email.split('@')[0],
    email: order.email,
    show: tourTitle || show.title,
    tour: tourTitle,
    city: show.city,
    venue: show.venue,
    address: show.address || '',
    date: d.full,
    time: formatShowTimeRange(show.showTime, show.showEndTime) || '',
    doors: show.doorsTime || '',
    tier: order.tierName || 'General Admission',
    quantity: String(order.quantity),
    total: formatPrice(order.amountTotal, order.currency),
    orderId: String(order._id),
  }
}

async function resolveArtworkBytes(
  show: ShowDocument & { tour?: TourDocument | unknown },
): Promise<Uint8Array | undefined> {
  const tour = tourOf(show)
  const key = tour?.ticketArtworkKey || show.artworkImageKey || ''
  const urlHint = tour?.ticketArtwork || show.artworkImage || ''

  const candidates: string[] = []
  if (key) {
    const pub = publicUrlForKey(key)
    if (pub) candidates.push(pub)
    try {
      candidates.push(await createR2DownloadUrl(key))
    } catch {
      // R2 may be unavailable — fall through to absolute site URLs
    }
  }
  if (urlHint) {
    if (/^https?:\/\//i.test(urlHint)) candidates.push(urlHint)
    else candidates.push(`${appUrl()}${urlHint.startsWith('/') ? '' : '/'}${urlHint}`)
  }

  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) continue
      const buf = new Uint8Array(await res.arrayBuffer())
      if (buf.length) return buf
    } catch {
      // try next candidate
    }
  }
  return undefined
}

/** Build + send the ticket confirmation email with the PDF tickets attached. */
export async function sendTicketEmail(
  order: TicketOrderLike,
  show: ShowDocument & { tour?: TourDocument | unknown },
) {
  const settings = await getEmailSettings()
  if (!settings.ticketEmailEnabled) return { skipped: true as const }

  const vars = ticketTemplateVars(show, order)
  const subject = substituteTemplate(settings.ticketEmailSubject, vars)
  const text = substituteTemplate(settings.ticketEmailBody, vars)
  const html = renderEmailHtml({
    bodyHtml: textToEmailHtml(text),
    signature: {
      name: settings.signatureName,
      tagline: settings.signatureTagline,
      linkUrl: settings.signatureLinkUrl,
      imageUrl: settings.signatureImageUrl,
    },
    appUrl: appUrl(),
  })

  const tour = tourOf(show)
  const artworkBytes = await resolveArtworkBytes(show)
  const pdf = await generateTicketsPdf({
    orderId: String(order._id),
    buyerEmail: order.email,
    tourTitle: vars.tour,
    showTitle: show.title,
    city: show.city,
    venue: show.venue,
    address: show.address || '',
    dateLabel: vars.date,
    timeLabel: vars.time,
    tierName: vars.tier,
    quantity: order.quantity,
    accentHex: tour?.ticketAccent || '#FF6600',
    artworkBytes,
  })

  const result = await sendEmail({
    to: [order.email],
    subject,
    text,
    html,
    attachments: [
      {
        filename: `kevin-fraser-tickets-${String(order._id).slice(-8)}.pdf`,
        content: Buffer.from(pdf).toString('base64'),
      },
    ],
  })

  return { skipped: false as const, id: result.id }
}
