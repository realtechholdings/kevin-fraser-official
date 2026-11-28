import { NextRequest, NextResponse } from 'next/server'
import {
  admitOnOrder,
  bareBooking,
  loadBooking,
  loadDoorOrder,
} from '@/lib/tickets/admissionService'
import { admissionCounts, lineState, parseScanCode } from '@/lib/tickets/admissions'
import { openScannerSession, orderAllowedAtDoor } from '@/lib/tickets/scannerSession'

export type ScanVerdict =
  /** Single ticket: let in on the scan. */
  | 'admitted'
  /** Group booking: the usher chooses how many to admit. */
  | 'booking'
  | 'already_admitted'
  | 'not_paid'
  | 'upgraded'
  | 'refunded'
  | 'transferred'
  | 'not_found'
  | 'invalid_ticket'
  | 'wrong_show'

/**
 * One scan for every ticket. A booking of one is admitted straight away; a
 * booking of several comes back with its allocation so the usher can say how
 * many have arrived.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const opened = await openScannerSession(body.showId)
    if (!opened.ok) return opened.response
    const { session } = opened

    const payload = parseScanCode(body.code)
    const order = payload ? await loadDoorOrder(payload.orderId) : null
    if (!payload || !order) {
      return NextResponse.json({ success: true, verdict: 'not_found' satisfies ScanVerdict })
    }

    if (!orderAllowedAtDoor(order, session)) {
      return NextResponse.json({
        success: true,
        verdict: 'wrong_show' satisfies ScanVerdict,
        booking: bareBooking(order, { hideGuest: session.doorOnly }),
      })
    }

    const ticket = payload.ticket
    if (ticket !== null && (ticket < 1 || ticket > order.quantity)) {
      return NextResponse.json({
        success: true,
        verdict: 'invalid_ticket' satisfies ScanVerdict,
        booking: bareBooking(order, { hideGuest: false }),
      })
    }

    const state = lineState(order)
    if (state !== 'open') {
      return NextResponse.json({
        success: true,
        verdict: state satisfies ScanVerdict,
        booking: await loadBooking(order),
      })
    }

    // This page of the PDF was refunded, upgraded or moved. The rest of the
    // booking may still be good, so the usher sees what is left on it.
    const voided = ticket
      ? (order.voidedTickets || []).find((row) => row.ticket === ticket)
      : undefined
    if (voided) {
      return NextResponse.json({
        success: true,
        verdict: voided.reason satisfies ScanVerdict,
        ticketVoided: true,
        booking: await loadBooking(order),
      })
    }

    const counts = admissionCounts(order)
    if (counts.purchased > 1) {
      return NextResponse.json({
        success: true,
        verdict: (counts.remaining > 0 ? 'booking' : 'already_admitted') satisfies ScanVerdict,
        scannedOrderId: String(order._id),
        booking: await loadBooking(order),
      })
    }

    const result = await admitOnOrder({
      orderId: String(order._id),
      quantity: 1,
      preferTicket: ticket,
      usher: session.usher,
      method: 'scan',
    })
    const fresh = (await loadDoorOrder(String(order._id))) || order
    const verdict: ScanVerdict = result.ok
      ? 'admitted'
      : result.reason === 'insufficient'
        ? 'already_admitted'
        : lineState(fresh) === 'open'
          ? 'not_found'
          : (lineState(fresh) as ScanVerdict)
    return NextResponse.json({
      success: true,
      verdict,
      admitted: result.ok ? 1 : 0,
      scannedOrderId: String(order._id),
      booking: await loadBooking(fresh),
    })
  } catch (error) {
    console.error('Scanner scan POST:', error)
    return NextResponse.json({ success: false, error: 'Could not check that ticket.' }, { status: 500 })
  }
}
