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

/** Format show calendar date in UTC so the wall-clock day never shifts by timezone. */
export function formatShowDate(iso: string) {
  const d = new Date(iso)
  const utc = { timeZone: 'UTC' as const }
  return {
    day: d.toLocaleDateString('en-AU', { ...utc, day: 'numeric' }),
    month: d.toLocaleDateString('en-AU', { ...utc, month: 'short' }).toUpperCase(),
    weekday: d.toLocaleDateString('en-AU', { ...utc, weekday: 'short' }),
    full: d.toLocaleDateString('en-AU', {
      ...utc,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  }
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
