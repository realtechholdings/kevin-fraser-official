import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import Order, { type OrderDocument } from '@/lib/models/Order'
// Registers schemas for .populate()
import '@/lib/models/Show'
import '@/lib/models/Tour'
import { formatShowDate } from '@/lib/format'
import { toWallIso } from '@/lib/wallDate'

export type ScanVerdict =
  | 'valid'
  | 'already_used'
  | 'not_paid'
  | 'not_found'
  | 'invalid_ticket'
  | 'wrong_show'
  | 'undone'
  | 'info'

type ScanPayload = {
  orderId: string
  ticket: number | null
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

function serializeScan(order: OrderDocument, ticket: number | null) {
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
    tierName: order.tierName || 'General Admission',
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
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const body = await req.json()
    const action =
      body.action === 'undo' ? 'undo' : body.action === 'lookup' ? 'lookup' : 'checkin'
    const payload = parsePayload(body)

    if (!payload || !mongoose.isValidObjectId(payload.orderId)) {
      return NextResponse.json({ success: true, verdict: 'not_found' as ScanVerdict })
    }

    await dbConnect()
    const order = await Order.findById(payload.orderId).populate({
      path: 'show',
      populate: { path: 'tour' },
    })

    if (!order) {
      return NextResponse.json({ success: true, verdict: 'not_found' as ScanVerdict })
    }

    // When the door is set to a specific show, refuse tickets from other shows.
    const expectedShowId = typeof body.showId === 'string' ? body.showId.trim() : ''
    if (expectedShowId && action === 'checkin') {
      const orderShowId = order.show ? String((order.show as { _id: unknown })._id) : ''
      if (orderShowId !== expectedShowId) {
        return NextResponse.json({
          success: true,
          verdict: 'wrong_show' as ScanVerdict,
          scan: serializeScan(order, payload.ticket),
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
      return NextResponse.json({
        success: true,
        verdict: 'not_paid' as ScanVerdict,
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
