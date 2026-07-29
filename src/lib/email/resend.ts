const RESEND_API = 'https://api.resend.com'

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

export function fromAddress() {
  return process.env.EMAIL_FROM?.trim() || 'Kevin Fraser <tickets@kevinfraser.com>'
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
