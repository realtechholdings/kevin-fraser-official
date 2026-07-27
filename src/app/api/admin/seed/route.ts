import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { seedDecadanceTour } from '@/lib/seed-decadance'

function seedErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return 'Seed failed.'
  const msg = error.message || 'Seed failed.'

  if (
    msg.includes('ENOTFOUND') ||
    msg.includes('querySrv') ||
    msg.includes('MongoNetworkError') ||
    msg.includes('ServerSelectionError')
  ) {
    return 'Database unreachable. MONGODB_URI points to a MongoDB cluster that cannot be found (check Atlas hostname / cluster status).'
  }
  if (msg.includes('MONGODB_URI')) {
    return 'MONGODB_URI is missing from the environment.'
  }
  if (msg.includes('bad auth') || msg.includes('Authentication failed')) {
    return 'MongoDB authentication failed. Check the username/password in MONGODB_URI.'
  }
  return msg
}

export async function POST() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const result = await seedDecadanceTour()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { success: false, error: seedErrorMessage(error) },
      { status: 500 }
    )
  }
}
