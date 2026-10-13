import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import Order from '@/lib/models/Order'
import { refundOrderTickets, refundPaidOrder, showForOrder } from '@/lib/tickets/refundOrder'
import { liveTicketNumbers } from '@/lib/tickets/ticketNumbers'
import { sendSalesRefundNotification } from '@/lib/email/salesNotify'

type Ctx = { params: Promise<{ id: string }> }

function hostOf(req: NextRequest) {
  return (req.headers.get('x-forwarded-host') || req.headers.get('host') || '')
    .split(',')[0]
    .trim()
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin('refunds')
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const { id } = await ctx.params
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: 'Invalid order id.' }, { status: 400 })
    }

    await dbConnect()
    const order = await Order.findById(id)
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found.' }, { status: 404 })
    }

    const raw = await req.text()
    let requested = 0
    if (raw) {
      try {
        requested = Math.floor(Number(JSON.parse(raw)?.quantity) || 0)
      } catch {
        requested = 0
      }
    }
    const live = liveTicketNumbers(order).length
    const partial = requested > 0 && requested < live
    const refundedBy = admin.emails?.[0] || admin.userId
    const result = partial
      ? await refundOrderTickets(order, requested, { refundedBy })
      : await refundPaidOrder(order, { refundedBy })
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status })
    }

    const show = await showForOrder(result.order)
    const refundedQuantity = partial ? requested : result.order.quantity
    const refundedCents = partial
      ? Math.round((order.amountTotal * requested) / Math.max(1, order.quantity))
      : undefined
    if (show && !result.already) {
      await sendSalesRefundNotification(result.order, show, {
        host: hostOf(req),
        ...(partial ? { amountCents: refundedCents, quantity: refundedQuantity } : {}),
      }).catch((error) => {
        console.error('Refund notify failed:', error)
      })
    }

    return NextResponse.json({
      success: true,
      already: result.already,
      partial,
      quantity: refundedQuantity,
      orderId: String(result.order._id),
      status: result.order.status,
    })
  } catch (error) {
    console.error('Admin refund POST:', error)
    const message = error instanceof Error ? error.message : 'Refund failed.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
