import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import Order from '@/lib/models/Order'
import Show from '@/lib/models/Show'
import '@/lib/models/Tour'
import { buildTicketPdfsForOrder } from '@/lib/email/ticket'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
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

    const pdfs = await buildTicketPdfsForOrder(
      {
        _id: order._id,
        email: order.email,
        holderName: order.holderName,
        quantity: order.quantity,
        amountTotal: order.amountTotal,
        currency: order.currency,
        tierName: order.tierName,
        tier: order.tier,
      },
      show,
    )

    return NextResponse.json({
      success: true,
      files: pdfs.map((pdf) => ({
        filename: pdf.filename,
        ticketNumber: pdf.ticketNumber,
        contentBase64: Buffer.from(pdf.bytes).toString('base64'),
      })),
    })
  } catch (error) {
    console.error('Admin ticket PDF GET:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate PDFs.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
