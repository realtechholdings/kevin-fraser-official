import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Order from '@/lib/models/Order'
import Show from '@/lib/models/Show'
import { getStripe, stripeRequestOptions } from '@/lib/stripe'

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

    if (session.payment_status === 'paid' && order && order.status !== 'paid') {
      order.status = 'paid'
      order.email = session.customer_details?.email || session.customer_email || order.email
      order.stripePaymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || ''
      order.amountTotal = session.amount_total || order.amountTotal
      await order.save()

      await Show.findByIdAndUpdate(order.show, {
        $inc: { ticketsSold: order.quantity },
      })
    }

    return NextResponse.json({
      success: true,
      paid: session.payment_status === 'paid',
      email: session.customer_details?.email || session.customer_email || order?.email || null,
      quantity: order?.quantity || Number(session.metadata?.quantity || 1),
      amountTotal: session.amount_total,
      currency: session.currency,
      showId: session.metadata?.showId || (order ? String(order.show) : null),
    })
  } catch (error) {
    console.error('Verify checkout error:', error)
    return NextResponse.json({ success: false, error: 'Could not verify payment.' }, { status: 500 })
  }
}
