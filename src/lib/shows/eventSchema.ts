import { parseWallParts, type WallParts } from '@/lib/wallDate'
import type { PublicShow, PublicTicketTier } from '@/lib/serialize'
import { isShowEffectivelySoldOut, isTierSoldOut, venueSeatRemaining } from '@/lib/tickets/soldOut'

export const PUBLIC_SITE_ORIGIN = 'https://kevinfraserofficial.com'

const CITY_TIME_ZONES: Record<string, string> = {
  adelaide: 'Australia/Adelaide',
  auckland: 'Pacific/Auckland',
  brisbane: 'Australia/Brisbane',
  cairns: 'Australia/Brisbane',
  canberra: 'Australia/Sydney',
  'cape town': 'Africa/Johannesburg',
  darwin: 'Australia/Darwin',
  durban: 'Africa/Johannesburg',
  geelong: 'Australia/Melbourne',
  'gold coast': 'Australia/Brisbane',
  hobart: 'Australia/Hobart',
  johannesburg: 'Africa/Johannesburg',
  joburg: 'Africa/Johannesburg',
  london: 'Europe/London',
  melbourne: 'Australia/Melbourne',
  newcastle: 'Australia/Sydney',
  perth: 'Australia/Perth',
  pretoria: 'Africa/Johannesburg',
  'sunshine coast': 'Australia/Brisbane',
  sydney: 'Australia/Sydney',
  wellington: 'Pacific/Auckland',
  wollongong: 'Australia/Sydney',
}

const COUNTRY_TIME_ZONES: Record<string, string> = {
  'south africa': 'Africa/Johannesburg',
  'new zealand': 'Pacific/Auckland',
  'united kingdom': 'Europe/London',
  uk: 'Europe/London',
  england: 'Europe/London',
  ireland: 'Europe/Dublin',
}

const COUNTRY_CODES: Record<string, string> = {
  australia: 'AU',
  'south africa': 'ZA',
  'new zealand': 'NZ',
  'united kingdom': 'GB',
  uk: 'GB',
  england: 'GB',
  'united states': 'US',
  usa: 'US',
  ireland: 'IE',
}

type Clock = { hour: number; minute: number }

export function showPageUrl(id: string, origin = PUBLIC_SITE_ORIGIN) {
  return `${origin.replace(/\/$/, '')}/worlds/stage/${id}`
}

/** "7:30 PM", "7pm", "19:30" → 24-hour clock. */
export function parseClockLabel(value: string | null | undefined): Clock | null {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
  if (!raw) return null
  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/)
  if (!match) return null

  let hour = Number(match[1])
  const minute = Number(match[2] || 0)
  const meridiem = match[3]
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute > 59) return null

  if (meridiem) {
    if (hour < 1 || hour > 12) return null
    if (meridiem === 'am') hour = hour === 12 ? 0 : hour
    else hour = hour === 12 ? 12 : hour + 12
  } else if (hour > 23) {
    return null
  }

  return { hour, minute }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** "Brisbane (Early Show)" → city Brisbane, qualifier Early Show. */
export function splitCityLabel(city: string) {
  const match = city.trim().match(/^(.*?)\s*\(([^)]+)\)\s*$/)
  if (!match) return { locality: city.trim(), qualifier: '' }
  return { locality: match[1].trim(), qualifier: match[2].trim() }
}

function timeZoneFor(city: string, country: string) {
  const locality = splitCityLabel(city).locality.toLowerCase()
  if (CITY_TIME_ZONES[locality]) return CITY_TIME_ZONES[locality]
  const keys = Object.keys(CITY_TIME_ZONES).sort((a, b) => b.length - a.length)
  const match = keys.find((key) => locality.startsWith(key))
  if (match) return CITY_TIME_ZONES[match]
  return COUNTRY_TIME_ZONES[country.trim().toLowerCase()] || ''
}

function countryCode(country: string) {
  const key = country.trim().toLowerCase()
  if (COUNTRY_CODES[key]) return COUNTRY_CODES[key]
  if (/^[a-z]{2}$/i.test(country.trim())) return country.trim().toUpperCase()
  return ''
}

/** Minutes east of UTC for an instant, using the zone's wall clock. */
function offsetMinutesAt(timeZone: string, instant: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  const asUtc = Date.UTC(
    pick('year'),
    pick('month') - 1,
    pick('day'),
    pick('hour'),
    pick('minute'),
    pick('second'),
  )
  return Math.round((asUtc - instant.getTime()) / 60000)
}

function formatOffset(minutes: number) {
  const sign = minutes >= 0 ? '+' : '-'
  const abs = Math.abs(minutes)
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

/** Offset for a wall-clock time in an IANA zone, including daylight saving. */
export function offsetForWallClock(timeZone: string, parts: WallParts): string | null {
  if (!timeZone) return null
  try {
    const wallAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second || 0,
    )
    let offset = offsetMinutesAt(timeZone, new Date(wallAsUtc))
    const instant = new Date(wallAsUtc - offset * 60_000)
    const corrected = offsetMinutesAt(timeZone, instant)
    if (corrected !== offset) offset = corrected
    return formatOffset(offset)
  } catch {
    return null
  }
}

function eventClock(show: Pick<PublicShow, 'date' | 'showTime'>): WallParts | null {
  const date = parseWallParts(show.date)
  if (!date) return null
  const clock = parseClockLabel(show.showTime)
  if (clock) {
    return { ...date, hour: clock.hour, minute: clock.minute, second: 0 }
  }
  return date
}

function hasExplicitTime(show: Pick<PublicShow, 'showTime'>, parts: WallParts) {
  if (parseClockLabel(show.showTime)) return true
  return parts.hour !== 0 || parts.minute !== 0 || parts.second !== 0
}

function isoDateTime(parts: WallParts, offset: string | null, withTime: boolean) {
  const date = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
  if (!withTime) return date
  const time = `T${pad(parts.hour)}:${pad(parts.minute)}:00`
  return offset ? `${date}${time}${offset}` : `${date}${time}`
}

function addDays(parts: WallParts, days: number): WallParts {
  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0))
  return {
    ...parts,
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  }
}

function endClock(
  show: Pick<PublicShow, 'showEndTime'>,
  start: WallParts,
): WallParts | null {
  const clock = parseClockLabel(show.showEndTime)
  if (!clock) return null
  let end: WallParts = { ...start, hour: clock.hour, minute: clock.minute, second: 0 }
  const startMins = start.hour * 60 + start.minute
  const endMins = end.hour * 60 + end.minute
  if (endMins <= startMins) end = addDays(end, 1)
  return end
}

function absoluteUrl(value: string, origin: string) {
  const raw = value.trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('/')) return `${origin}${raw}`
  return ''
}

function plainText(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 500)
}

function priceText(cents: number) {
  const amount = Math.max(0, cents) / 100
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2)
}

function offerAvailability(show: PublicShow, tier?: PublicTicketTier) {
  if (show.status === 'cancelled') return 'https://schema.org/SoldOut'
  if (show.status === 'coming_soon') return 'https://schema.org/PreOrder'
  if (tier) {
    const soldOut = isTierSoldOut(tier, venueSeatRemaining(show), show.tiers, show.status)
    return soldOut ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock'
  }
  return isShowEffectivelySoldOut(show)
    ? 'https://schema.org/SoldOut'
    : 'https://schema.org/InStock'
}

function ticketOffers(show: PublicShow, ticketUrl: string) {
  const published = (show.tiers || []).filter((tier) => tier.published !== false)
  const rows = published.length
    ? published
    : [
        {
          name: 'Ticket',
          priceCents: show.priceCents,
          currency: show.currency,
        },
      ]

  return rows.map((tier) => {
    const offer: Record<string, unknown> = {
      '@type': 'Offer',
      url: ticketUrl,
      price: priceText('priceCents' in tier ? tier.priceCents : show.priceCents),
      priceCurrency: (tier.currency || show.currency || 'AUD').toUpperCase(),
      availability: offerAvailability(show, 'id' in tier ? (tier as PublicTicketTier) : undefined),
    }
    if ('name' in tier && tier.name && tier.name !== 'Ticket') offer.name = tier.name
    const validFrom = show.ticketsOnSaleAt ? parseWallParts(show.ticketsOnSaleAt) : null
    if (validFrom) {
      offer.validFrom = `${validFrom.year}-${pad(validFrom.month)}-${pad(validFrom.day)}`
    }
    return offer
  })
}

/** schema.org Event object for Google's event listing. */
export function buildShowEventJsonLd(show: PublicShow, origin = PUBLIC_SITE_ORIGIN) {
  const start = eventClock(show)
  const zone = timeZoneFor(show.city, show.country)
  const offset = start ? offsetForWallClock(zone, start) : null
  const pageUrl = showPageUrl(show.id, origin)
  const external = absoluteUrl(show.externalTicketUrl || '', origin)
  const ticketUrl = external || pageUrl
  const description =
    plainText(show.description) ||
    plainText(
      show.tour.title
        ? `${show.tour.title} comes to ${show.city} — ${show.venue}.`
        : `Kevin Fraser live in ${show.city}.`,
    )
  const image = absoluteUrl(show.artworkImage || show.venueImage || '', origin)
  const code = countryCode(show.country)
  const { locality, qualifier } = splitCityLabel(show.city)
  const address: Record<string, string> = { '@type': 'PostalAddress' }
  if (show.address) address.streetAddress = show.address
  if (locality) address.addressLocality = locality
  if (code) address.addressCountry = code

  const title = show.title?.trim() || `Kevin Fraser in ${locality || show.city}`
  const name =
    qualifier && !title.toLowerCase().includes(qualifier.toLowerCase())
      ? `${title} — ${qualifier}`
      : title

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': pageUrl,
    name,
    description,
    startDate: start ? isoDateTime(start, offset, hasExplicitTime(show, start)) : undefined,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus:
      show.status === 'cancelled'
        ? 'https://schema.org/EventCancelled'
        : 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: show.venue,
      address,
    },
    offers: ticketOffers(show, ticketUrl),
    performer: {
      '@type': 'Person',
      name: 'Kevin Fraser',
    },
    organizer: {
      '@type': 'Organization',
      name: 'Kevin Fraser Official',
      url: origin,
    },
  }

  const end = start ? endClock(show, start) : null
  if (end) data.endDate = isoDateTime(end, offsetForWallClock(zone, end) || offset, true)
  if (image) data.image = [image]

  return data
}

export function showEventJsonLdScript(show: PublicShow, origin = PUBLIC_SITE_ORIGIN) {
  return JSON.stringify(buildShowEventJsonLd(show, origin)).replace(/</g, '\\u003c')
}
