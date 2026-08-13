import Stripe from 'stripe'

let stripe: Stripe | null = null

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }

  // Organization keys (sk_org_*) require Stripe-Context = target account id (acct_...)
  const stripeContext = process.env.STRIPE_CONTEXT || process.env.STRIPE_ACCOUNT_ID

  if (!stripe) {
    stripe = new Stripe(key, {
      apiVersion: '2026-06-24.dahlia',
      typescript: true,
      ...(stripeContext ? { stripeContext } : {}),
    })
  }
  return stripe
}

export function stripeRequestOptions(): Stripe.RequestOptions | undefined {
  const stripeContext = process.env.STRIPE_CONTEXT || process.env.STRIPE_ACCOUNT_ID
  return stripeContext ? { stripeContext } : undefined
}

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
}

const ALLOWED_CHECKOUT_HOSTS = new Set([
  'kevinfraserofficial.com',
  'www.kevinfraserofficial.com',
  'kevin-fraser-official.vercel.app',
  'localhost',
  '127.0.0.1',
])

/**
 * Base URL for Stripe success/cancel redirects.
 * Prefers the host the buyer actually used (so vercel.app tests return there),
 * falling back to NEXT_PUBLIC_APP_URL.
 */
export function checkoutReturnUrl(req: { headers: Headers; nextUrl?: URL }): string {
  const originHeader = req.headers.get('origin')
  const referer = req.headers.get('referer')
  const forwardedHost = req.headers.get('x-forwarded-host')
  const host = req.headers.get('host')
  const proto = (req.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim()

  const candidates = [originHeader, referer, forwardedHost ? `${proto}://${forwardedHost}` : '', host ? `${proto}://${host}` : '']

  for (const raw of candidates) {
    if (!raw) continue
    try {
      const url = new URL(raw)
      const hostname = url.hostname.toLowerCase()
      const allowed =
        ALLOWED_CHECKOUT_HOSTS.has(hostname) ||
        hostname.endsWith('.vercel.app')
      if (!allowed) continue
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${url.protocol}//${url.host}`.replace(/\/$/, '')
      }
      return `https://${hostname}`.replace(/\/$/, '')
    } catch {
      // try next
    }
  }

  return appUrl()
}

