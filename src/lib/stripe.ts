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
