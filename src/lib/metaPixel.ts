export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || '790739178846787'

const PENDING_CHECKOUT_KEY = 'meta_pending_checkout'

export type MetaContentParams = {
  content_ids?: string[]
  content_name?: string
  content_type?: string
  content_category?: string
  value?: number
  currency?: string
  num_items?: number
}

export type PendingCheckout = MetaContentParams & {
  showId?: string
  startedAt: number
}

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void
      queue?: unknown[]
      loaded?: boolean
      version?: string
      push?: (...args: unknown[]) => void
    }
    _fbq?: Window['fbq']
  }
}

export function isMetaPixelEnabled() {
  return Boolean(META_PIXEL_ID)
}

export function trackMeta(
  event: string,
  params?: MetaContentParams,
  options?: { eventID?: string },
) {
  if (typeof window === 'undefined' || !isMetaPixelEnabled() || typeof window.fbq !== 'function') {
    return
  }
  if (options?.eventID) {
    window.fbq('track', event, params || {}, { eventID: options.eventID })
  } else {
    window.fbq('track', event, params || {})
  }
}

export function trackMetaCustom(event: string, params?: MetaContentParams) {
  if (typeof window === 'undefined' || !isMetaPixelEnabled() || typeof window.fbq !== 'function') {
    return
  }
  window.fbq('trackCustom', event, params || {})
}

export function savePendingCheckout(data: Omit<PendingCheckout, 'startedAt'>) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(
      PENDING_CHECKOUT_KEY,
      JSON.stringify({ ...data, startedAt: Date.now() } satisfies PendingCheckout),
    )
  } catch {
    // ignore storage failures
  }
}

export function readPendingCheckout(): PendingCheckout | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(PENDING_CHECKOUT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PendingCheckout
  } catch {
    return null
  }
}

export function clearPendingCheckout() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(PENDING_CHECKOUT_KEY)
  } catch {
    // ignore
  }
}

export function centsToMetaValue(cents: number) {
  return Math.round(cents) / 100
}
