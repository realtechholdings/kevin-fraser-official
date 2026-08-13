import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Order from '@/lib/models/Order'
import { getStripe, stripeRequestOptions } from '@/lib/stripe'
import { fulfillPaidOrder } from '@/lib/tickets/fulfillPaidOrder'
import { notifyPaidOrderEmails } from '@/lib/tickets/notifyPaidOrder'

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
      const host =
        req.headers.get('x-forwarded-host') ||
        req.headers.get('host') ||
        new URL(req.url).host
      await notifyPaidOrderEmails(order, { host })
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
      emailSent: Boolean(order?.confirmationEmailSentAt),
      salesNotified: Boolean(order?.salesNotifyEmailSentAt),
    })
  } catch (error) {
    console.error('Verify checkout error:', error)
    return NextResponse.json({ success: false, error: 'Could not verify payment.' }, { status: 500 })
  }
}
