import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import Order from '@/lib/models/Order'
import Show from '@/lib/models/Show'
import '@/lib/models/Tour'
import { sendTicketEmail } from '@/lib/email/ticket'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const admin = await requireAdmin()
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
    if (order.status !== 'paid') {
      return NextResponse.json({ success: false, error: 'Order is not paid.' }, { status: 400 })
    }

    const show = await Show.findById(order.show).populate('tour')
    if (!show) {
      return NextResponse.json({ success: false, error: 'Show not found for this order.' }, { status: 404 })
    }

    // Allow resend even if already emailed.
    order.confirmationEmailSentAt = null
    await order.save()

    const result = await sendTicketEmail(
      {
        _id: order._id,
        email: order.email,
        holderName: order.holderName,
        quantity: order.quantity,
        amountTotal: order.amountTotal,
        currency: order.currency,
        tierName: order.tierName,
        tier: order.tier,
        tableNames: order.tableNames || [],
        tableSeats: order.tableSeats || 0,
      },
      show,
    )

    if (result.skipped) {
      return NextResponse.json(
        { success: false, error: 'Ticket email is disabled — enable it in CMS first.' },
        { status: 400 },
      )
    }

    order.confirmationEmailSentAt = new Date()
    await order.save()

    return NextResponse.json({ success: true, id: result.id })
  } catch (error) {
    console.error('Admin ticket send POST:', error)
    const message = error instanceof Error ? error.message : 'Failed to send tickets.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
