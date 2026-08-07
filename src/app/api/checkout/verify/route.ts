import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Order from '@/lib/models/Order'
import Show from '@/lib/models/Show'
// Registers the Tour schema for .populate('tour')
import '@/lib/models/Tour'
import { getStripe, stripeRequestOptions } from '@/lib/stripe'
import { emailConfigured } from '@/lib/email/resend'
import { sendTicketEmail } from '@/lib/email/ticket'
import { fulfillPaidOrder } from '@/lib/tickets/fulfillPaidOrder'

export async function GET(req: NextRequest) {
  try {
    const sessionId = new URL(req.url).searchParams.get('session_id')
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Missing session_id.' }, { status: 400 })
    }

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      undefined,
      stripeRequestOptions()
    )

    await dbConnect()
    const order = await Order.findOne({ stripeSessionId: sessionId })

    if (session.payment_status === 'paid' && order) {
      await fulfillPaidOrder(order, session)
    }

    // Send the ticket PDF email once, after payment is confirmed
    if (
      session.payment_status === 'paid' &&
      order &&
      !order.confirmationEmailSentAt &&
      emailConfigured()
    ) {
      try {
        const show = await Show.findById(order.show).populate('tour')
        if (show) {
          const sent = await sendTicketEmail(order, show)
          if (!sent.skipped) {
            order.confirmationEmailSentAt = new Date()
            await order.save()
          }
        }
      } catch (emailError) {
        console.error('Ticket email failed:', emailError)
      }
    }

    return NextResponse.json({
      success: true,
      paid: session.payment_status === 'paid',
      email: session.customer_details?.email || session.customer_email || order?.email || null,
      quantity: order?.quantity || Number(session.metadata?.quantity || 1),
      amountTotal: session.amount_total,
      currency: session.currency,
      showId: session.metadata?.showId || (order ? String(order.show) : null),
      tierName: order?.tierName || session.metadata?.tierName || null,
    })
  } catch (error) {
    console.error('Verify checkout error:', error)
    return NextResponse.json({ success: false, error: 'Could not verify payment.' }, { status: 500 })
  }
}
