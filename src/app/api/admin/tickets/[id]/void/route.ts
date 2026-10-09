import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import Order from '@/lib/models/Order'
import { voidCompOrder } from '@/lib/tickets/refundOrder'

type Params = { params: Promise<{ id: string }> }

/**
 * Reverse a complimentary / manual issue. Same privilege as issuing one —
 * no money moves, so this does not need the refunds permission.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const admin = await requireAdmin('tickets')
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const { id } = await params
    if (!id || !mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: 'Invalid order id.' }, { status: 400 })
    }

    await dbConnect()
    const order = await Order.findById(id)
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found.' }, { status: 404 })
    }

    const result = await voidCompOrder(order, {
      voidedBy: admin.emails?.[0] || admin.userId,
    })
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      already: result.already,
      orderId: String(result.order._id),
      status: result.order.status,
    })
  } catch (error) {
    console.error('Admin ticket void POST:', error)
    const message = error instanceof Error ? error.message : 'Void failed.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
