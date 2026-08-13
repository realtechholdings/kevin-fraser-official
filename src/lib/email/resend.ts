const RESEND_API = 'https://api.resend.com'

/** Production custom domain — ticket mail comes from the official address. */
export const EMAIL_FROM_PRODUCTION = 'Kevin Fraser <tickets@kevinfraserofficial.com>'

/** Preview / Vercel staging — Resend sends via the hivemynd.io domain. */
export const EMAIL_FROM_STAGING = 'Kevin Fraser <kevinfraser@hivemynd.io>'

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
}

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY)
}

function siteHost(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || '').trim()
  if (!raw) return ''
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    return new URL(withProto).hostname.toLowerCase()
  } catch {
    return raw.toLowerCase()
  }
}

/** True when this deployment is the live kevinfraserofficial.com site. */
export function isProductionMailHost(host = siteHost()) {
  return host === 'kevinfraserofficial.com' || host === 'www.kevinfraserofficial.com'
}

/**
 * From-address for Resend.
 * - www.kevinfraserofficial.com → tickets@kevinfraserofficial.com
 * - vercel.app / local / other → kevinfraser@hivemynd.io
 * EMAIL_FROM overrides when set (per-environment on Vercel).
 */
export function fromAddress() {
  const override = process.env.EMAIL_FROM?.trim()
  if (override) return override
  return isProductionMailHost() ? EMAIL_FROM_PRODUCTION : EMAIL_FROM_STAGING
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
      from: fromAddress(),
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
