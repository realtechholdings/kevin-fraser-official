import { formatShowDate, slugify } from '@/lib/format'

/** Stable public path segment from the city and the show's wall-clock date. */
export function showSlugFrom(city: string, date: Date | string | null | undefined) {
  const iso = date instanceof Date ? date.toISOString() : String(date || '')
  const formatted = formatShowDate(iso)
  const cityPart = slugify(city) || 'show'
  const datePart = slugify([formatted.day, formatted.month, formatted.year].filter(Boolean).join(' '))
  return datePart ? `${cityPart}-${datePart}` : cityPart
}

export function showPublicPath(show: { id: string; slug?: string | null }) {
  const slug = String(show.slug || '').trim()
  return `/worlds/stage/${slug || show.id}`
}
