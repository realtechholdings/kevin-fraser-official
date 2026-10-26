import { sendEmail, fromAddress } from '@/lib/email/resend'

export const WAITLIST_NOTIFY_TO = 'tickets@kevinfraserofficial.com'

export async function sendWaitlistNotification(input: {
  name: string
  email: string
  city: string
  venue: string
  dateLabel: string
  host?: string
}) {
  const where = [input.city, input.venue, input.dateLabel].filter(Boolean).join(' · ')
  const text = [
    'A customer joined the sold-out waitlist.',
    '',
    `Show: ${where}`,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
  ].join('\n')
  return sendEmail({
    to: [WAITLIST_NOTIFY_TO],
    from: fromAddress(input.host),
    replyTo: input.email,
    subject: `Waitlist — ${input.city || 'show'} — ${input.name}`,
    text,
    html: text
      .split('\n')
      .map((line) => (line ? `<p>${line.replace(/</g, '&lt;')}</p>` : '<br/>'))
      .join(''),
  })
}
