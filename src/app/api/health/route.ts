import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db'

export async function GET() {
  const checks: Record<string, boolean> = {
    api: true,
    mongodb: false,
    clerk: false,
    openrouter: false,
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

  const allGreen = Object.values(checks).every(Boolean)

  return NextResponse.json({
    ok: allGreen,
    checks,
    timestamp: new Date().toISOString(),
  }, { status: 200 })
}
