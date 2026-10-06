import { normalizeCheckoutEmail } from '@/lib/email/address'
import { renderEmailHtml, textToEmailHtml } from '@/lib/email/branding'
import { emailConfigured, salesFromAddress, sendEmail } from '@/lib/email/resend'
import { formatShowDate } from '@/lib/format'
import { appUrl } from '@/lib/stripe'

export const CORPORATE_BOOKINGS_TO = 'info@kevinfraserofficial.com'

export const CORPORATE_EVENT_TYPES = [
  'Conference',
  'Product launch',
  'Private function',
  'Brand activation',
  'Awards',
  'Other',
] as const

export type CorporateEventType = (typeof CORPORATE_EVENT_TYPES)[number]

export type CorporateBooking = {
  name: string
  email: string
  company: string
  eventType: CorporateEventType
  date: string
  dateLabel: string
  city: string
  audienceSize: number
  budget: string
  notes: string
}

const MAX_SHORT = 120
const MAX_NOTES = 2000

function clean(value: unknown, max: number) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max)
}

function isEventType(value: string): value is CorporateEventType {
  return (CORPORATE_EVENT_TYPES as readonly string[]).includes(value)
}

export function parseCorporateBooking(
  body: unknown,
): { ok: true; booking: CorporateBooking } | { ok: false; error: string } {
  const input = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const name = clean(input.name, MAX_SHORT)
  const email = normalizeCheckoutEmail(input.email)
  const company = clean(input.company, MAX_SHORT)
  const eventType = clean(input.eventType, 40)
  const date = clean(input.date, 10)
  const city = clean(input.city, MAX_SHORT)
  const budget = clean(input.budget, MAX_SHORT)
  const notes = String(input.notes || '').trim().slice(0, MAX_NOTES)
  const audienceSize = Number(String(input.audienceSize || '').trim())

  if (!name || !email || !eventType || !date || !city || !budget || !input.audienceSize) {
    return { ok: false, error: 'Name, email, date, city, audience size, budget, and event type are required.' }
  }
  if (!isEventType(eventType)) {
    return { ok: false, error: 'Choose an event type.' }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !formatShowDate(`${date}T12:00:00.000`).full) {
    return { ok: false, error: 'Enter a valid date.' }
  }
  if (!Number.isInteger(audienceSize) || audienceSize < 1 || audienceSize > 1_000_000) {
    return { ok: false, error: 'Enter an audience size as a whole number.' }
  }

  return {
    ok: true,
    booking: {
      name,
      email,
      company,
      eventType,
      date,
      dateLabel: formatShowDate(`${date}T12:00:00.000`).full,
      city,
      audienceSize,
      budget,
      notes,
    },
  }
}

export function corporateBookingMessage(booking: CorporateBooking) {
  const subject = `Corporate booking — ${booking.city} · ${booking.dateLabel}`
  const text = [
    'A corporate booking enquiry was submitted on the website.',
    '',
    `Name: ${booking.name}`,
    `Email: ${booking.email}`,
    ...(booking.company ? [`Company: ${booking.company}`] : []),
    `Event type: ${booking.eventType}`,
    `Date: ${booking.dateLabel}`,
    `City: ${booking.city}`,
    `Audience size: ${booking.audienceSize}`,
    `Budget: ${booking.budget}`,
    ...(booking.notes ? ['', 'Notes:', booking.notes] : []),
  ].join('\n')
  return { subject, text }
}

export async function sendCorporateBooking(booking: CorporateBooking, host?: string) {
  if (!emailConfigured()) return { skipped: true as const, reason: 'not_configured' as const }

  const { subject, text } = corporateBookingMessage(booking)
  const from = salesFromAddress(host)
  const result = await sendEmail({
    to: [CORPORATE_BOOKINGS_TO],
    from,
    subject,
    text,
    html: renderEmailHtml({
      bodyHtml: textToEmailHtml(text),
      appUrl: appUrl(),
    }),
    replyTo: booking.email,
  })

  return { skipped: false as const, id: result.id, from, to: CORPORATE_BOOKINGS_TO }
}
