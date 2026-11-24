import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { readScanPractice, resetScanPractice, setupScanPractice } from '@/lib/tickets/scanPractice'

export async function GET() {
  const admin = await requireAdmin('scanner')
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const practice = await readScanPractice()
    return NextResponse.json({ success: true, practice })
  } catch (error) {
    console.error('Scanner practice GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load the scan test.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin('scanner')
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const practice = body.action === 'reset' ? await resetScanPractice() : await setupScanPractice()
    return NextResponse.json({ success: true, practice })
  } catch (error) {
    console.error('Scanner practice POST:', error)
    return NextResponse.json({ success: false, error: 'Failed to set up the scan test.' }, { status: 500 })
  }
}
