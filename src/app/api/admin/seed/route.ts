import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { seedDecadanceTour } from '@/lib/seed-decadance'

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
    return NextResponse.json({ success: false, error: 'Seed failed.' }, { status: 500 })
  }
}
