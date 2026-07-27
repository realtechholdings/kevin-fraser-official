import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db'

export async function GET() {
  const checks: Record<string, boolean> = {
    api: true,
    mongodb: false,
    clerk: false,
    openrouter: false,
    stripe: false,
  }

  // MongoDB
  try {
    await dbConnect()
    checks.mongodb = true
  } catch {}

  // Clerk
  checks.clerk = !!(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY)

  // OpenRouter
  checks.openrouter = !!process.env.OPENROUTER_API_KEY

  // Stripe secret present; org keys also need STRIPE_CONTEXT / STRIPE_ACCOUNT_ID
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const stripeContext = process.env.STRIPE_CONTEXT || process.env.STRIPE_ACCOUNT_ID
  checks.stripe = !!stripeKey && (!stripeKey.startsWith('sk_org_') || !!stripeContext)

  const allGreen = Object.values(checks).every(Boolean)

  return NextResponse.json({
    ok: allGreen,
    checks,
    timestamp: new Date().toISOString(),
  }, { status: 200 })
}
