import { parseWallParts } from '@/lib/wallDate'

export function formatPrice(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`
  }
}

/** Format show calendar date from wall-clock digits only (no timezone shift). */
export function formatShowDate(iso: string) {
  const parts = parseWallParts(iso)
  if (!parts) {
    return { day: '', month: '', weekday: '', full: '' }
  }

  // Build a UTC date from the wall digits so weekday/month names stay on that calendar day.
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0))
  const utc = { timeZone: 'UTC' as const }

  return {
    day: d.toLocaleDateString('en-AU', { ...utc, day: 'numeric' }),
    month: d.toLocaleDateString('en-AU', { ...utc, month: 'short' }).toUpperCase(),
    weekday: d.toLocaleDateString('en-AU', { ...utc, weekday: 'short' }),
    year: String(parts.year),
    full: d.toLocaleDateString('en-AU', {
      ...utc,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  }
}

/** Display show start/end labels as a range when both are set. */
export function formatShowTimeRange(start?: string | null, end?: string | null) {
  const s = (start || '').trim()
  const e = (end || '').trim()
  if (s && e) return `${s} – ${e}`
  return s || e
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
