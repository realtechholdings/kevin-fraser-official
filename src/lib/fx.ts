import { formatPrice } from '@/lib/format'
import { SUPPORTED_CURRENCIES } from '@/lib/currencies'

export const BASE_CURRENCY = 'AUD'

export type AudRates = {
  base: typeof BASE_CURRENCY
  /** ISO date the feed was published, if known */
  asOf: string | null
  /** Units of foreign currency per 1 AUD (e.g. ZAR: 12.4) */
  perAud: Record<string, number>
}

const CACHE_MS = 6 * 60 * 60 * 1000
let cache: { at: number; data: AudRates } | null = null

function normalisePerAud(raw: Record<string, number>): Record<string, number> {
  const perAud: Record<string, number> = { [BASE_CURRENCY]: 1 }
  for (const code of SUPPORTED_CURRENCIES) {
    const key = code.toLowerCase()
    const value = raw[code] ?? raw[key]
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      perAud[code] = value
    }
  }
  perAud[BASE_CURRENCY] = 1
  return perAud
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`FX feed ${res.status}`)
  return res.json()
}

async function loadRates(): Promise<AudRates> {
  try {
    const data = (await fetchJson(
      'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/aud.min.json',
    )) as { date?: string; aud?: Record<string, number> }
    if (data?.aud && typeof data.aud === 'object') {
      return {
        base: BASE_CURRENCY,
        asOf: data.date ? String(data.date) : null,
        perAud: normalisePerAud(data.aud),
      }
    }
  } catch {
    // Fall through to ECB/Frankfurter
  }

  const data = (await fetchJson('https://api.frankfurter.app/latest?from=AUD')) as {
    date?: string
    rates?: Record<string, number>
  }
  if (!data?.rates) throw new Error('No FX rates available')
  return {
    base: BASE_CURRENCY,
    asOf: data.date ? String(data.date) : null,
    perAud: normalisePerAud(data.rates),
  }
}

export async function getAudRates(): Promise<AudRates> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data
  const data = await loadRates()
  cache = { at: Date.now(), data }
  return data
}

/** Convert a price in `currency` minor units to AUD cents. */
export function foreignToAudCents(
  cents: number,
  currency: string,
  rates: AudRates | null | undefined,
): number | null {
  if (!Number.isFinite(cents)) return null
  const code = String(currency || '').toUpperCase()
  if (!code) return null
  if (code === BASE_CURRENCY) return Math.round(cents)
  const perAud = rates?.perAud[code]
  if (!perAud || perAud <= 0) return null
  return Math.round(cents / perAud)
}

export function formatAudEquivalent(
  cents: number,
  currency: string,
  rates: AudRates | null | undefined,
): string | null {
  const code = String(currency || '').toUpperCase()
  if (code === BASE_CURRENCY) return null
  const audCents = foreignToAudCents(cents, code, rates)
  if (audCents === null) return null
  return `≈ ${formatPrice(audCents, BASE_CURRENCY)}`
}

export function formatPriceWithAud(
  cents: number,
  currency: string,
  rates: AudRates | null | undefined,
): string {
  const local = formatPrice(cents, currency)
  const aud = formatAudEquivalent(cents, currency, rates)
  return aud ? `${local} (${aud})` : local
}
