import { NextRequest, NextResponse } from 'next/server'
import mongoose, { type HydratedDocument } from 'mongoose'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import Order, { type OrderDocument } from '@/lib/models/Order'
// Registers schemas for .populate()
import '@/lib/models/Show'
import '@/lib/models/Tour'
import { formatShowDate } from '@/lib/format'
import { toWallIso } from '@/lib/wallDate'
import { tableNameForSeat } from '@/lib/tickets/tables'
import { isDoorStaff } from '@/lib/admin/access'
import { doorStaffShowError } from '@/lib/tickets/doorAccess'
import { isShowOnDoorNight } from '@/lib/tickets/doorDay'
import { SCAN_PRACTICE_SESSION, isScanPracticeOrder } from '@/lib/tickets/scanPractice'

export type ScanVerdict =
  | 'valid'
  | 'already_used'
  | 'not_paid'
  | 'upgraded'
  | 'refunded'
  | 'not_found'
  | 'invalid_ticket'
  | 'wrong_show'
  | 'undone'
  | 'info'

type ScanPayload = {
  orderId: string
  ticket: number | null
}

type OrderMatch = ReturnType<typeof serializeScan>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function readEmail(body: Record<string, unknown>) {
  const raw = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  return EMAIL_RE.test(raw) ? raw : ''
}

/** Accepts either the raw QR string ({"order":"...","ticket":1,"of":2}) or explicit fields. */
function parsePayload(body: Record<string, unknown>): ScanPayload | null {
  if (typeof body.code === 'string' && body.code.trim()) {
    try {
      const parsed = JSON.parse(body.code)
      if (parsed && typeof parsed.order === 'string') {
        return { orderId: parsed.order, ticket: Number(parsed.ticket) || null }
      }
    } catch {
      // Not JSON — maybe the QR/manual input is just an order id
      const raw = body.code.trim()
      if (mongoose.isValidObjectId(raw)) return { orderId: raw, ticket: null }
    }
    return null
  }
  if (typeof body.orderId === 'string' && body.orderId.trim()) {
    return {
      orderId: body.orderId.trim(),
      ticket: body.ticket !== undefined && body.ticket !== null ? Number(body.ticket) : null,
    }
  }
  return null
}

function serializeScan(
  order: Pick<
    OrderDocument,
    | 'email'
    | 'holderName'
    | 'tierName'
    | 'tableSeats'
    | 'tableNames'
    | 'quantity'
    | 'status'
    | 'checkedIn'
    | 'show'
  > & { _id: unknown },
  ticket: number | null,
) {
  const show = order.show as unknown as {
    _id: unknown
    city?: string
    venue?: string
    date?: Date
    tour?: { title?: string } | null
  } | null

  const dateLabel = show?.date ? formatShowDate(toWallIso(show.date) || String(show.date)).full : ''

  return {
    orderId: String(order._id),
    email: order.email,
    holderName: order.holderName || '',
    tierName: order.tierName || 'General Admission',
    tableName: ticket
      ? tableNameForSeat(ticket, order.tableSeats || 0, order.tableNames || [])
      : (order.tableNames || []).join(', '),
    quantity: order.quantity,
    status: order.status,
    ticket,
    checkedIn: (order.checkedIn || []).map((c) => ({
      ticket: c.ticket,
      at: c.at ? new Date(c.at).toISOString() : null,
    })),
    show: show
      ? {
          city: show.city || '',
          venue: show.venue || '',
          date: dateLabel,
          tour: show.tour && typeof show.tour === 'object' ? show.tour.title || '' : '',
        }
      : null,
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin('scanner')
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const body = await req.json()
    const action =
      body.action === 'undo' ? 'undo' : body.action === 'lookup' ? 'lookup' : 'checkin'
    const doorOnly = isDoorStaff(admin.access)
    const expectedShowId = typeof body.showId === 'string' ? body.showId.trim() : ''

    if (doorOnly && (action === 'checkin' || action === 'undo' || action === 'lookup')) {
      const doorError = await doorStaffShowError(admin.access.permissions, expectedShowId)
      if (doorError) {
        return NextResponse.json({ success: false, error: doorError }, { status: 403 })
      }
    }

    await dbConnect()
    const email = readEmail(body)
    let payload = parsePayload(body)
    let order: HydratedDocument<OrderDocument> | null = null

    if (email) {
      const filter: Record<string, unknown> = {
        email,
        stripeSessionId: { $ne: SCAN_PRACTICE_SESSION },
      }
      if (mongoose.isValidObjectId(expectedShowId)) filter.show = expectedShowId
      const matches = await Order.find(filter)
        .populate({ path: 'show', populate: { path: 'tour' } })
        .sort({ createdAt: -1 })
        .limit(20)

      if (matches.length === 0) {
        return NextResponse.json({ success: true, verdict: 'not_found' as ScanVerdict })
      }

      const ticketNumber =
        body.ticket !== undefined && body.ticket !== null && body.ticket !== ''
          ? Number(body.ticket)
          : null
      const only = matches.length === 1 ? matches[0] : null
      const resolvedTicket =
        ticketNumber ?? (action === 'checkin' && only?.quantity === 1 ? 1 : null)

      if (only && (action === 'lookup' || resolvedTicket === null)) {
        return NextResponse.json({
          success: true,
          verdict: 'info' as ScanVerdict,
          scan: serializeScan(only, null),
        })
      }

      if (!only) {
        return NextResponse.json({
          success: true,
          verdict: 'info' as ScanVerdict,
          matches: matches.map((match) => serializeScan(match, null)) satisfies OrderMatch[],
        })
      }

      order = only
      payload = { orderId: String(only._id), ticket: resolvedTicket }
    }

    if (!order) {
      if (!payload || !mongoose.isValidObjectId(payload.orderId)) {
        return NextResponse.json({ success: true, verdict: 'not_found' as ScanVerdict })
      }

      order = await Order.findById(payload.orderId).populate({
        path: 'show',
        populate: { path: 'tour' },
      })
    }

    if (!order || !payload) {
      return NextResponse.json({ success: true, verdict: 'not_found' as ScanVerdict })
    }

    // A selected door only accepts that show. Practice tickets never check in
    // unless the door is explicitly the practice show, so a test cannot mark
    // a real guest as already inside.
    const orderShowId = order.show ? String((order.show as { _id: unknown })._id) : ''
    const showDoc = order.show as {
      date?: Date
      city?: string
      country?: string
    } | null
    if (doorOnly && showDoc && !isShowOnDoorNight(showDoc.date, showDoc.city || '', showDoc.country || '')) {
      const scan = serializeScan(order, payload.ticket)
      return NextResponse.json({
        success: true,
        verdict: 'wrong_show' as ScanVerdict,
        scan: { ...scan, email: '', holderName: '' },
      })
    }
    if (action === 'checkin' || action === 'undo' || doorOnly) {
      const doorMismatch = Boolean(expectedShowId) && orderShowId !== expectedShowId
      const practiceAwayFromItsDoor = isScanPracticeOrder(order) && orderShowId !== expectedShowId
      if (doorMismatch || practiceAwayFromItsDoor) {
        const scan = serializeScan(order, payload.ticket)
        return NextResponse.json({
          success: true,
          verdict: 'wrong_show' as ScanVerdict,
          scan: doorOnly ? { ...scan, email: '', holderName: '' } : scan,
        })
      }
    }

    if (action === 'lookup' || payload.ticket === null) {
      return NextResponse.json({
        success: true,
        verdict: 'info' as ScanVerdict,
        scan: serializeScan(order, null),
      })
    }

    const ticket = payload.ticket
    if (!Number.isInteger(ticket) || ticket < 1 || ticket > order.quantity) {
      return NextResponse.json({
        success: true,
        verdict: 'invalid_ticket' as ScanVerdict,
        scan: serializeScan(order, ticket),
      })
    }

    const voided = (order.voidedTickets || []).find((row) => row.ticket === ticket)
    if (voided) {
      return NextResponse.json({
        success: true,
        verdict: (voided.reason === 'upgraded' ? 'upgraded' : 'refunded') as ScanVerdict,
        scan: serializeScan(order, ticket),
      })
    }

    if (action === 'undo') {
      const idx = order.checkedIn.findIndex((c) => c.ticket === ticket)
      if (idx >= 0) order.checkedIn.splice(idx, 1)
      await order.save()
      return NextResponse.json({
        success: true,
        verdict: 'undone' as ScanVerdict,
        scan: serializeScan(order, ticket),
      })
    }

    if (order.status !== 'paid') {
      const verdict: ScanVerdict =
        order.status === 'upgraded'
          ? 'upgraded'
          : order.status === 'refunded'
            ? 'refunded'
            : 'not_paid'
      return NextResponse.json({
        success: true,
        verdict,
        scan: serializeScan(order, ticket),
      })
    }

    const existing = order.checkedIn.find((c) => c.ticket === ticket)
    if (existing) {
      return NextResponse.json({
        success: true,
        verdict: 'already_used' as ScanVerdict,
        scan: serializeScan(order, ticket),
      })
    }

    order.checkedIn.push({ ticket, at: new Date() })
    await order.save()
    return NextResponse.json({
      success: true,
      verdict: 'valid' as ScanVerdict,
      scan: serializeScan(order, ticket),
    })
  } catch (error) {
    console.error('Scanner verify POST:', error)
    return NextResponse.json({ success: false, error: 'Verification failed.' }, { status: 500 })
  }
}
