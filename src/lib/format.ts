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

export function formatShowDate(iso: string) {
  const d = new Date(iso)
  return {
    day: d.toLocaleDateString('en-AU', { day: 'numeric' }),
    month: d.toLocaleDateString('en-AU', { month: 'short' }).toUpperCase(),
    weekday: d.toLocaleDateString('en-AU', { weekday: 'short' }),
    full: d.toLocaleDateString('en-AU', {
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
