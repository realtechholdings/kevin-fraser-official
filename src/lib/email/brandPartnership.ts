import { normalizeCheckoutEmail } from '@/lib/email/address'
import { renderEmailHtml, textToEmailHtml } from '@/lib/email/branding'
import { emailConfigured, salesFromAddress, sendEmail } from '@/lib/email/resend'
import { appUrl } from '@/lib/stripe'

export const BRAND_PARTNERSHIPS_TO = 'info@kevinfraserofficial.com'

export const PARTNERSHIP_TYPES = [
  'Sponsored content',
  'Brand ambassador',
  'Product placement',
  'Event appearance / activation',
  'Merch or licensing collab',
  'Other',
] as const

export type PartnershipType = (typeof PARTNERSHIP_TYPES)[number]

export const PARTNERSHIP_CHANNELS = [
  'Instagram',
  'TikTok',
  'YouTube',
  'Facebook',
  'Live shows',
  'Podcast / radio',
] as const

export type PartnershipChannel = (typeof PARTNERSHIP_CHANNELS)[number]

export type BrandPartnership = {
  name: string
  email: string
  brand: string
  role: string
  website: string
  partnershipType: PartnershipType
  channels: PartnershipChannel[]
  timeline: string
  budget: string
  brief: string
}

const MAX_SHORT = 120
const MAX_URL = 300
const MAX_BRIEF = 3000

function clean(value: unknown, max: number) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max)
}

function isPartnershipType(value: string): value is PartnershipType {
  return (PARTNERSHIP_TYPES as readonly string[]).includes(value)
}

function isChannel(value: string): value is PartnershipChannel {
  return (PARTNERSHIP_CHANNELS as readonly string[]).includes(value)
}

function cleanWebsite(value: unknown) {
  const raw = clean(value, MAX_URL)
  if (!raw) return ''
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const url = new URL(withScheme)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname.includes('.')) return null
    return url.toString()
  } catch {
    return null
  }
}

export function parseBrandPartnership(
  body: unknown,
): { ok: true; partnership: BrandPartnership } | { ok: false; error: string } {
  const input = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const name = clean(input.name, MAX_SHORT)
  const email = normalizeCheckoutEmail(input.email)
  const brand = clean(input.brand, MAX_SHORT)
  const role = clean(input.role, MAX_SHORT)
  const partnershipType = clean(input.partnershipType, 60)
  const timeline = clean(input.timeline, MAX_SHORT)
  const budget = clean(input.budget, MAX_SHORT)
  const brief = String(input.brief || '').trim().slice(0, MAX_BRIEF)
  const channels = Array.from(
    new Set(
      (Array.isArray(input.channels) ? input.channels : [])
        .map((c) => clean(c, 40))
        .filter(isChannel),
    ),
  )

  if (!name || !email || !brand || !partnershipType || !budget || !brief) {
    return {
      ok: false,
      error: 'Name, email, brand, partnership type, budget, and a short brief are required.',
    }
  }
  if (!isPartnershipType(partnershipType)) {
    return { ok: false, error: 'Choose a partnership type.' }
  }
  const website = cleanWebsite(input.website)
  if (website === null) {
    return { ok: false, error: 'Enter a valid website address.' }
  }

  return {
    ok: true,
    partnership: {
      name,
      email,
      brand,
      role,
      website,
      partnershipType,
      channels,
      timeline,
      budget,
      brief,
    },
  }
}

export function brandPartnershipMessage(partnership: BrandPartnership) {
  const subject = `Brand partnership — ${partnership.brand} · ${partnership.partnershipType}`
  const text = [
    'A brand partnership enquiry was submitted on the website.',
    '',
    `Name: ${partnership.name}`,
    `Email: ${partnership.email}`,
    `Brand: ${partnership.brand}`,
    ...(partnership.role ? [`Role: ${partnership.role}`] : []),
    ...(partnership.website ? [`Website: ${partnership.website}`] : []),
    `Partnership type: ${partnership.partnershipType}`,
    ...(partnership.channels.length ? [`Channels: ${partnership.channels.join(', ')}`] : []),
    ...(partnership.timeline ? [`Timeline: ${partnership.timeline}`] : []),
    `Budget: ${partnership.budget}`,
    '',
    'Brief:',
    partnership.brief,
  ].join('\n')
  return { subject, text }
}

export async function sendBrandPartnership(partnership: BrandPartnership, host?: string) {
  if (!emailConfigured()) return { skipped: true as const, reason: 'not_configured' as const }

  const { subject, text } = brandPartnershipMessage(partnership)
  const from = salesFromAddress(host)
  const result = await sendEmail({
    to: [BRAND_PARTNERSHIPS_TO],
    from,
    subject,
    text,
    html: renderEmailHtml({
      bodyHtml: textToEmailHtml(text),
      appUrl: appUrl(),
    }),
    replyTo: partnership.email,
  })

  return { skipped: false as const, id: result.id, from, to: BRAND_PARTNERSHIPS_TO }
}
