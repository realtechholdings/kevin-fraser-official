import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { getAudRates } from '@/lib/fx'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const rates = await getAudRates()
    return NextResponse.json({ success: true, rates })
  } catch (error) {
    console.error('Admin FX GET:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load AUD conversion rates.' },
      { status: 502 },
    )
  }
}
