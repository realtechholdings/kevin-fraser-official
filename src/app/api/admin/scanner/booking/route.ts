import { NextRequest, NextResponse } from 'next/server'
import { loadBooking, loadDoorOrder } from '@/lib/tickets/admissionService'
import { openScannerSession, orderAllowedAtDoor } from '@/lib/tickets/scannerSession'

/**
 * Current state of one booking: allocation per ticket class and admission
 * history. Scanners re-read this while a booking is open, so an admission at
 * another door shows up without a rescan.
 */
export async function GET(req: NextRequest) {
  try {
    const opened = await openScannerSession(req.nextUrl.searchParams.get('showId') || '')
    if (!opened.ok) return opened.response

    const order = await loadDoorOrder(req.nextUrl.searchParams.get('orderId') || '')
    if (!order) {
      return NextResponse.json({ success: false, error: 'Booking not found.' }, { status: 404 })
    }
    if (!orderAllowedAtDoor(order, opened.session)) {
      return NextResponse.json(
        { success: false, error: 'That booking is not for this door.' },
        { status: 403 },
      )
    }
    return NextResponse.json({ success: true, booking: await loadBooking(order) })
  } catch (error) {
    console.error('Scanner booking GET:', error)
    return NextResponse.json({ success: false, error: 'Could not load that booking.' }, { status: 500 })
  }
}
