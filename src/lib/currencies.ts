/** Currencies supported for ticket pricing (Stripe presentment currencies). */
export const SUPPORTED_CURRENCIES = [
  'AUD',
  'NZD',
  'USD',
  'CAD',
  'GBP',
  'EUR',
  'SGD',
  'HKD',
  'JPY',
  'ZAR',
  'AED',
] as const

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

export function isSupportedCurrency(value: string): value is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value.toUpperCase())
}

export function normalizeCurrency(value: unknown, fallback: SupportedCurrency = 'AUD') {
  const upper = String(value || '').toUpperCase()
  return isSupportedCurrency(upper) ? upper : fallback
}
