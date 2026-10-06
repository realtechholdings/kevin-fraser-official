import { NextRequest, NextResponse } from 'next/server'
import { parseCorporateBooking, sendCorporateBooking } from '@/lib/email/corporateBooking'

function requestHost(req: NextRequest) {
  return (req.headers.get('x-forwarded-host') || req.headers.get('host') || '')
    .split(',')[0]
    .trim()
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 })
  }

  const parsed = parseCorporateBooking(body)
  if (!parsed.ok) {
    return NextResponse.json({ success: false, error: parsed.error }, { status: 400 })
  }

  try {
    const sent = await sendCorporateBooking(parsed.booking, requestHost(req))
    if (sent.skipped) {
      return NextResponse.json(
        { success: false, error: 'Enquiry email is not configured yet.' },
        { status: 503 },
      )
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Corporate booking email failed:', error)
    return NextResponse.json(
      { success: false, error: 'Could not send your enquiry. Please try again.' },
      { status: 502 },
    )
  }
}
