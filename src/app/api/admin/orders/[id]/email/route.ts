import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import Order from '@/lib/models/Order'
import { getEmailDelivery } from '@/lib/email/resend'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin('tickets')
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const { id } = await ctx.params
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: 'Invalid order id.' }, { status: 400 })
    }
    await dbConnect()
    const order = await Order.findById(id).select('confirmationEmailSentAt confirmationEmailId email')
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found.' }, { status: 404 })
    }
    const sentAt = order.confirmationEmailSentAt
      ? new Date(order.confirmationEmailSentAt).toISOString()
      : null
    const emailId = String(order.confirmationEmailId || '').trim()
    if (!emailId) {
      return NextResponse.json({
        success: true,
        email: order.email,
        sentAt,
        lastEvent: sentAt ? 'sent' : 'not_sent',
      })
    }
    const delivery = await getEmailDelivery(emailId)
    return NextResponse.json({
      success: true,
      email: order.email,
      sentAt,
      emailId: delivery.id,
      lastEvent: delivery.lastEvent || 'sent',
    })
  } catch (error) {
    console.error('Admin email status GET:', error)
    const message = error instanceof Error ? error.message : 'Could not check delivery.'
    return NextResponse.json({ success: false, error: message }, { status: 502 })
  }
}
