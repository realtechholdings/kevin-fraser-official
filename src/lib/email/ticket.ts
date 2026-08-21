import type { OrderDocument } from '@/lib/models/Order'
import type { ShowDocument } from '@/lib/models/Show'
import type { TourDocument } from '@/lib/models/Tour'
import type { TicketTierDocument } from '@/lib/models/TicketTier'
import TicketTier from '@/lib/models/TicketTier'
import { getEmailSettings } from '@/lib/models/EmailSettings'
import { formatPrice, formatShowDate, formatShowTimeRange } from '@/lib/format'
import { toWallIso } from '@/lib/wallDate'
import { appUrl } from '@/lib/stripe'
import { renderEmailHtml, substituteTemplate, textToEmailHtml } from '@/lib/email/branding'
import { fromAddress, sendEmail } from '@/lib/email/resend'
import { generateTicketPdfs } from '@/lib/email/ticketPdf'
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
> & { _id: unknown; tier?: unknown; holderName?: string }

export function ticketTemplateVars(
  show: ShowDocument & { tour?: TourDocument | unknown },
  order: TicketOrderLike,
) {
  const d = formatShowDate(toWallIso(show.date) || String(show.date))
  const tourTitle = tourTitleOf(show)
  const holderName = String(order.holderName || '').trim()
  return {
    name: holderName || order.email.split('@')[0],
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

async function resolveArtworkBytes(opts: {
  artworkKey?: string
  artworkUrl?: string
}): Promise<Uint8Array | undefined> {
  const key = opts.artworkKey || ''
  const urlHint = opts.artworkUrl || ''
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

async function resolveTicketBranding(
  show: ShowDocument & { tour?: TourDocument | unknown },
  order: TicketOrderLike,
) {
  const tour = tourOf(show)
  let tier: TicketTierDocument | null = null
  if (order.tier) {
    try {
      tier = await TicketTier.findById(String(order.tier))
    } catch {
      tier = null
    }
  }

  const accentHex =
    String(tier?.ticketAccent || '').trim() ||
    String(tour?.ticketAccent || '').trim() ||
    '#FF6600'

  const artworkKey =
    String(tier?.ticketArtworkKey || '').trim() ||
    String(tour?.ticketArtworkKey || '').trim() ||
    String(show.artworkImageKey || '').trim()

  const artworkUrl =
    String(tier?.ticketArtwork || '').trim() ||
    String(tour?.ticketArtwork || '').trim() ||
    String(show.artworkImage || '').trim()

  const artworkBytes = await resolveArtworkBytes({ artworkKey, artworkUrl })
  return { accentHex, artworkBytes }
}

/** Build + send the ticket confirmation email with one PDF attachment per ticket. */
export async function sendTicketEmail(
  order: TicketOrderLike,
  show: ShowDocument & { tour?: TourDocument | unknown },
  opts?: { host?: string },
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

  const branding = await resolveTicketBranding(show, order)
  const pdfs = await generateTicketPdfs({
    orderId: String(order._id),
    buyerEmail: order.email,
    holderName: String(order.holderName || '').trim(),
    tourTitle: vars.tour,
    showTitle: show.title,
    city: show.city,
    venue: show.venue,
    address: show.address || '',
    dateLabel: vars.date,
    timeLabel: vars.time,
    tierName: vars.tier,
    quantity: order.quantity,
    accentHex: branding.accentHex,
    artworkBytes: branding.artworkBytes,
  })

  const from = fromAddress(opts?.host)
  const result = await sendEmail({
    to: [order.email],
    from,
    subject,
    text,
    html,
    attachments: pdfs.map((pdf) => ({
      filename: pdf.filename,
      content: Buffer.from(pdf.bytes).toString('base64'),
    })),
  })

  return { skipped: false as const, id: result.id, from, attachmentCount: pdfs.length }
}

/** Build ticket PDF bytes for an order (email + admin download). */
export async function buildTicketPdfsForOrder(
  order: TicketOrderLike,
  show: ShowDocument & { tour?: TourDocument | unknown },
) {
  const vars = ticketTemplateVars(show, order)
  const branding = await resolveTicketBranding(show, order)
  return generateTicketPdfs({
    orderId: String(order._id),
    buyerEmail: order.email,
    holderName: String(order.holderName || '').trim(),
    tourTitle: vars.tour,
    showTitle: show.title,
    city: show.city,
    venue: show.venue,
    address: show.address || '',
    dateLabel: vars.date,
    timeLabel: vars.time,
    tierName: vars.tier,
    quantity: order.quantity,
    accentHex: branding.accentHex,
    artworkBytes: branding.artworkBytes,
  })
}
