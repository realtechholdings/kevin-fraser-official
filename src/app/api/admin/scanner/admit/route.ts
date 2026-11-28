import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { admitOnOrder, loadBooking, loadDoorOrder } from '@/lib/tickets/admissionService'
import { DEFAULT_TIER_NAME } from '@/lib/tickets/admissions'
import { openScannerSession, orderAllowedAtDoor } from '@/lib/tickets/scannerSession'

const MAX_LINES = 12

type LineRequest = { orderId: string; quantity: number }

function readLines(raw: unknown): LineRequest[] {
  if (!Array.isArray(raw)) return []
  const byOrder = new Map<string, number>()
  for (const item of raw.slice(0, MAX_LINES)) {
    const orderId = typeof item?.orderId === 'string' ? item.orderId.trim() : ''
    const quantity = Math.floor(Number(item?.quantity) || 0)
    if (!mongoose.isValidObjectId(orderId) || quantity < 1) continue
    byOrder.set(orderId, (byOrder.get(orderId) || 0) + quantity)
  }
  return Array.from(byOrder, ([orderId, quantity]) => ({ orderId, quantity }))
}

/**
 * Admit a chosen number of guests from a booking. Each ticket class is its
 * own line with its own allocation. If another door has just used some of a
 * line, that line is refused with the number actually left, and nothing on
 * it is admitted.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const opened = await openScannerSession(body.showId)
    if (!opened.ok) return opened.response
    const { session } = opened

    const lines = readLines(body.lines)
    if (!lines.length) {
      return NextResponse.json(
        { success: false, error: 'Choose how many guests to admit.' },
        { status: 400 },
      )
    }
    const method = body.method === 'search' ? 'search' : 'scan'

    // Check every line belongs at this door before anyone is admitted on any of them.
    const tierNames = new Map<string, string>()
    for (const line of lines) {
      const order = await loadDoorOrder(line.orderId)
      if (!order || !orderAllowedAtDoor(order, session)) {
        return NextResponse.json(
          { success: false, error: 'That booking is not for this door.' },
          { status: 403 },
        )
      }
      tierNames.set(line.orderId, order.tierName || DEFAULT_TIER_NAME)
    }

    let admitted = 0
    const refused: { orderId: string; tierName: string; asked: number; remaining: number }[] = []
    for (const line of lines) {
      const result = await admitOnOrder({
        orderId: line.orderId,
        quantity: line.quantity,
        usher: session.usher,
        method,
      })
      if (result.ok) {
        admitted += result.tickets.length
      } else {
        refused.push({
          orderId: line.orderId,
          tierName: tierNames.get(line.orderId) || DEFAULT_TIER_NAME,
          asked: line.quantity,
          remaining: result.remaining,
        })
      }
    }

    const anchorId =
      typeof body.anchorOrderId === 'string' && mongoose.isValidObjectId(body.anchorOrderId)
        ? body.anchorOrderId
        : lines[0].orderId
    const anchor = await loadDoorOrder(anchorId)
    const booking = anchor && orderAllowedAtDoor(anchor, session) ? await loadBooking(anchor) : null

    return NextResponse.json({
      success: true,
      verdict: refused.length === 0 ? 'admitted' : admitted > 0 ? 'partly_admitted' : 'not_admitted',
      admitted,
      refused,
      booking,
    })
  } catch (error) {
    console.error('Scanner admit POST:', error)
    return NextResponse.json({ success: false, error: 'Could not admit those guests.' }, { status: 500 })
  }
}
