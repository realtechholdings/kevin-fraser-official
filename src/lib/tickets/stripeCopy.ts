import { formatShowDate, formatShowTimeRange } from '@/lib/format'
import { toWallIso } from '@/lib/wallDate'

/**
 * Strip phone / WhatsApp-style numbers from copy that is sent to Stripe.
 * Never send venue or address — those fields are where a contact number
 * usually lives, and they do not belong on a card statement or receipt.
 */
export function stripContactNumbers(value: string) {
  return String(value || '')
    .replace(/\b(?:tel|phone|cell|mobile|whatsapp|wa)\b\.?:?\s*/gi, '')
    .replace(/(?:\+|00)?\d[\d\s()./\u00a0-]{6,}\d/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s,;|/·-]+$/g, '')
    .replace(/^[\s,;|/·-]+/g, '')
    .trim()
}

export function stripeShowCopy(show: {
  title: string
  city: string
  date: Date | string
  showTime?: string | null
  showEndTime?: string | null
  tour?: { title?: string } | unknown
}) {
  const tourFromShow =
    show.tour && typeof show.tour === 'object' && 'title' in show.tour
      ? String((show.tour as { title: string }).title || '')
      : ''
  const date = formatShowDate(toWallIso(show.date) || String(show.date)).full
  const time = formatShowTimeRange(show.showTime, show.showEndTime) || show.showTime || ''
  const city = stripContactNumbers(show.city)
  const when = [date, time].filter(Boolean).join(' · ')
  const tourTitle = stripContactNumbers(tourFromShow || show.title)

  return {
    tourTitle,
    city,
    when,
    /** City + date/time only. Never venue, address, or phone. */
    lineDescription: [city, when].filter(Boolean).join(' · '),
  }
}
