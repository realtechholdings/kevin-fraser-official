const RESEND_API = 'https://api.resend.com'

/** Production custom domain — ticket mail comes from the official address. */
export const EMAIL_FROM_PRODUCTION = 'Kevin Fraser <tickets@kevinfraserofficial.com>'

/** Preview / Vercel staging — Resend sends via the hivemynd.io domain. */
export const EMAIL_FROM_STAGING = 'Kevin Fraser <kevinfraser@hivemynd.io>'

/** Internal sales alerts on the live site. */
export const EMAIL_SALES_FROM_PRODUCTION = 'Kevin Fraser Sales <sales@kevinfraserofficial.com>'

/** Internal sales alerts on vercel.app / staging (hivemynd Resend domain). */
export const EMAIL_SALES_FROM_STAGING = 'Kevin Fraser Sales <sales@hivemynd.io>'

/** Where new-order alerts are delivered. */
export const SALES_NOTIFY_TO =
  process.env.SALES_NOTIFY_TO?.trim() || 'accounts@kevinfraserofficial.com'

export type EmailAttachment = {
  filename: string
  /** Base64-encoded file content */
  content: string
}

export type SendEmailInput = {
  to: string[]
  subject: string
  text: string
  html: string
  attachments?: EmailAttachment[]
  replyTo?: string
  /** Override default from-address (ticket vs sales). */
  from?: string
}

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY)
}

export function normalizeMailHost(raw: string) {
  const value = raw.trim().toLowerCase()
  if (!value) return ''
  try {
    const withProto = /^https?:\/\//i.test(value) ? value : `https://${value}`
    return new URL(withProto).hostname.toLowerCase()
  } catch {
    return value.split('/')[0].split(':')[0]
  }
}

function siteHost(): string {
  return normalizeMailHost(process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || '')
}

/** True when this host is the live kevinfraserofficial.com site. */
export function isProductionMailHost(host = siteHost()) {
  const h = normalizeMailHost(host)
  return h === 'kevinfraserofficial.com' || h === 'www.kevinfraserofficial.com'
}

/**
 * From-address for buyer ticket emails.
 * - www.kevinfraserofficial.com → tickets@kevinfraserofficial.com
 * - vercel.app / local / other → kevinfraser@hivemynd.io
 * EMAIL_FROM overrides when set (per-environment on Vercel).
 */
export function fromAddress(host?: string) {
  const override = process.env.EMAIL_FROM?.trim()
  if (override) return override
  return isProductionMailHost(host) ? EMAIL_FROM_PRODUCTION : EMAIL_FROM_STAGING
}

/**
 * From-address for internal sales / accounts notifications.
 * - kevinfraserofficial.com → sales@kevinfraserofficial.com
 * - vercel.app / other → sales@hivemynd.io
 * EMAIL_SALES_FROM overrides when set.
 */
export function salesFromAddress(host?: string) {
  const override = process.env.EMAIL_SALES_FROM?.trim()
  if (override) return override
  return isProductionMailHost(host) ? EMAIL_SALES_FROM_PRODUCTION : EMAIL_SALES_FROM_STAGING
}

export async function sendEmail(input: SendEmailInput): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set — add it to your environment to send email.')
  }

  const res = await fetch(`${RESEND_API}/emails`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      from: input.from || fromAddress(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      ...(input.attachments?.length ? { attachments: input.attachments } : {}),
    }),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body?.message || `Resend error (${res.status})`)
  }
  return { id: String(body.id || '') }
}
