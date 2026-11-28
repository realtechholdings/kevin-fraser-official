import { NextRequest, NextResponse } from 'next/server'
import { searchBookings } from '@/lib/tickets/admissionService'
import { openScannerSession } from '@/lib/tickets/scannerSession'

/** Find a booking by guest name, email, table or booking reference. */
export async function GET(req: NextRequest) {
  try {
    const opened = await openScannerSession(req.nextUrl.searchParams.get('showId') || '')
    if (!opened.ok) return opened.response

    const found = await searchBookings({
      query: req.nextUrl.searchParams.get('q') || '',
      showId: opened.session.showId,
    })
    return NextResponse.json({ success: true, ...found })
  } catch (error) {
    console.error('Scanner search GET:', error)
    return NextResponse.json({ success: false, error: 'Search failed.' }, { status: 500 })
  }
}
