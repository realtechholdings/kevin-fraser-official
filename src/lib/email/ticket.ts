import type { OrderDocument } from '@/lib/models/Order'
import type { ShowDocument } from '@/lib/models/Show'
import type { TourDocument } from '@/lib/models/Tour'
import type { TicketTierDocument } from '@/lib/models/TicketTier'
import TicketTier from '@/lib/models/TicketTier'
import {
  DEFAULT_UPGRADE_BODY,
  DEFAULT_UPGRADE_OFFER_BODY,
  DEFAULT_UPGRADE_OFFER_SUBJECT,
  DEFAULT_UPGRADE_SUBJECT,
  getEmailSettings,
} from '@/lib/models/EmailSettings'
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
> & {
  _id: unknown
  tier?: unknown
  holderName?: string
  tableNames?: string[]
  tableSeats?: number
}

export type UpgradeEmailVars = {
  oldTier?: string
  newTier?: string
  upgradePrice?: string
  upgradeUrl?: string
  offers?: string
}

export function ticketTemplateVars(
  show: ShowDocument & { tour?: TourDocument | unknown },
  order: TicketOrderLike,
  extra?: UpgradeEmailVars,
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
    tier: extra?.newTier || order.tierName || 'General Admission',
    oldTier: extra?.oldTier || order.tierName || 'General Admission',
    newTier: extra?.newTier || order.tierName || 'General Admission',
    quantity: String(order.quantity),
    total: formatPrice(order.amountTotal, order.currency),
    upgradePrice: extra?.upgradePrice || '',
    upgradeUrl: extra?.upgradeUrl || '',
    offers: extra?.offers || '',
    orderId: String(order._id),
    table: (order.tableNames || []).filter(Boolean).join(', '),
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

async function upgradeUrlForOrder(
  order: TicketOrderLike,
  host?: string,
) {
  try {
    const { listUpgradeTargets } = await import('@/lib/tickets/upgrades')
    const { upgradeManageUrl } = await import('@/lib/tickets/upgradeToken')
    const Order = (await import('@/lib/models/Order')).default
    const doc = await Order.findById(String(order._id))
    if (!doc) return { url: '', offers: '' as string, featured: null as null | { name: string; price: string } }
    const listed = await listUpgradeTargets(doc, { publicOnly: true })
    if (listed.blocked || !listed.targets.length) {
      return { url: '', offers: '', featured: null }
    }
    const url = upgradeManageUrl(String(order._id), order.email, host)
    const offers = listed.targets
      .map((t) => `• ${t.name} — ${formatPrice(t.chargeCents, t.currency)} more`)
      .join('\n')
    const first = listed.targets[0]
    return {
      url,
      offers,
      featured: first
        ? { name: first.name, price: formatPrice(first.chargeCents, first.currency) }
        : null,
    }
  } catch {
    return { url: '', offers: '', featured: null }
  }
}

/** Build + send the ticket confirmation email with one PDF attachment per ticket. */
export async function sendTicketEmail(
  order: TicketOrderLike,
  show: ShowDocument & { tour?: TourDocument | unknown },
  opts?: { host?: string },
) {
  const settings = await getEmailSettings()
  if (!settings.ticketEmailEnabled) return { skipped: true as const }

  const extra = await upgradeUrlForOrder(order, opts?.host)
  const vars = ticketTemplateVars(show, order, {
    upgradeUrl: extra.url,
    oldTier: order.tierName,
    newTier: extra.featured?.name,
    upgradePrice: extra.featured?.price,
    offers: extra.offers,
  })
  const subject = substituteTemplate(settings.ticketEmailSubject, vars)
  let text = substituteTemplate(settings.ticketEmailBody, vars)
  if (extra.url && !settings.ticketEmailBody.includes('{{upgradeUrl}}')) {
    text = `${text.trim()}\n\nWant to upgrade these tickets? ${extra.url}`
  }
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
    tableNames: order.tableNames || [],
    tableSeats: order.tableSeats || 0,
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
    tableNames: order.tableNames || [],
    tableSeats: order.tableSeats || 0,
    accentHex: branding.accentHex,
    artworkBytes: branding.artworkBytes,
  })
}

async function sendTemplatedEmail(opts: {
  to: string
  host?: string
  subject: string
  text: string
  attachments?: { filename: string; content: string }[]
}) {
  const settings = await getEmailSettings()
  const html = renderEmailHtml({
    bodyHtml: textToEmailHtml(opts.text),
    signature: {
      name: settings.signatureName,
      tagline: settings.signatureTagline,
      linkUrl: settings.signatureLinkUrl,
      imageUrl: settings.signatureImageUrl,
    },
    appUrl: appUrl(),
  })
  const result = await sendEmail({
    to: [opts.to],
    from: fromAddress(opts.host),
    subject: opts.subject,
    text: opts.text,
    html,
    attachments: opts.attachments,
  })
  return result
}

/** New PDFs after an upgrade — old tickets are void. */
export async function sendUpgradeEmail(
  order: TicketOrderLike,
  show: ShowDocument & { tour?: TourDocument | unknown },
  extra: { oldTier: string; newTier: string },
  opts?: { host?: string },
) {
  const settings = await getEmailSettings()
  if (settings.upgradeEmailEnabled === false) return { skipped: true as const }

  const vars = ticketTemplateVars(show, order, extra)
  const subject = substituteTemplate(
    settings.upgradeEmailSubject || DEFAULT_UPGRADE_SUBJECT,
    vars,
  )
  const text = substituteTemplate(settings.upgradeEmailBody || DEFAULT_UPGRADE_BODY, vars)
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
    tierName: extra.newTier || vars.tier,
    quantity: order.quantity,
    tableNames: order.tableNames || [],
    tableSeats: order.tableSeats || 0,
    accentHex: branding.accentHex,
    artworkBytes: branding.artworkBytes,
  })

  const result = await sendTemplatedEmail({
    to: order.email,
    host: opts?.host,
    subject,
    text,
    attachments: pdfs.map((pdf) => ({
      filename: pdf.filename,
      content: Buffer.from(pdf.bytes).toString('base64'),
    })),
  })
  return { skipped: false as const, id: result.id, attachmentCount: pdfs.length }
}

/** Optional follow-up / companion mail with upgrade offers. */
export async function sendUpgradeOfferEmail(
  order: TicketOrderLike,
  show: ShowDocument & { tour?: TourDocument | unknown },
  opts?: { host?: string; preview?: UpgradeEmailVars },
) {
  const settings = await getEmailSettings()
  if (!settings.upgradeOfferEmailEnabled && !opts?.preview) return { skipped: true as const }

  const extra = opts?.preview
    ? {
        url: opts.preview.upgradeUrl || 'https://kevinfraserofficial.com/worlds/stage/upgrade',
        offers: opts.preview.offers || '• Polaroids — $20 more',
        featured: {
          name: opts.preview.newTier || 'Polaroids',
          price: opts.preview.upgradePrice || '$20',
        },
      }
    : await upgradeUrlForOrder(order, opts?.host)
  if (!extra.url) return { skipped: true as const }

  const vars = ticketTemplateVars(show, order, {
    upgradeUrl: extra.url,
    oldTier: order.tierName,
    newTier: extra.featured?.name,
    upgradePrice: extra.featured?.price,
    offers: extra.offers,
  })
  const subject = substituteTemplate(
    settings.upgradeOfferEmailSubject || DEFAULT_UPGRADE_OFFER_SUBJECT,
    vars,
  )
  const text = substituteTemplate(
    settings.upgradeOfferEmailBody || DEFAULT_UPGRADE_OFFER_BODY,
    vars,
  )
  const result = await sendTemplatedEmail({
    to: order.email,
    host: opts?.host,
    subject,
    text,
  })
  return { skipped: false as const, id: result.id }
}
