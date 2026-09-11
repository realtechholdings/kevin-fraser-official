import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import Order from '@/lib/models/Order'
import { refundPaidOrder, showForOrder } from '@/lib/tickets/refundOrder'
import { sendSalesRefundNotification } from '@/lib/email/salesNotify'

type Ctx = { params: Promise<{ id: string }> }

function hostOf(req: NextRequest) {
  return (req.headers.get('x-forwarded-host') || req.headers.get('host') || '')
    .split(',')[0]
    .trim()
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin()
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

    const result = await refundPaidOrder(order, {
      refundedBy: admin.emails?.[0] || admin.userId,
    })
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status })
    }

    const show = await showForOrder(result.order)
    if (show && !result.already) {
      await sendSalesRefundNotification(result.order, show, { host: hostOf(req) }).catch((error) => {
        console.error('Refund notify failed:', error)
      })
    }

    return NextResponse.json({
      success: true,
      already: result.already,
      orderId: String(result.order._id),
      status: result.order.status,
    })
  } catch (error) {
    console.error('Admin refund POST:', error)
    const message = error instanceof Error ? error.message : 'Refund failed.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
