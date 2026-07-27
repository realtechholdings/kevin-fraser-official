import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Tickets Confirmed | Kevin Fraser Official',
}

type Props = {
  searchParams: Promise<{ session_id?: string }>
}

async function verify(sessionId?: string) {
  if (!sessionId) return null
  try {
    const { getStripe, stripeRequestOptions } = await import('@/lib/stripe')
    const dbConnect = (await import('@/lib/db')).default
    const Order = (await import('@/lib/models/Order')).default
    const Show = (await import('@/lib/models/Show')).default

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
      await Show.findByIdAndUpdate(order.show, { $inc: { ticketsSold: order.quantity } })
    }

    return {
      paid: session.payment_status === 'paid',
      email: session.customer_details?.email || session.customer_email || order?.email || null,
      quantity: order?.quantity || 1,
    }
  } catch {
    return null
  }
}

export default async function StageSuccessPage({ searchParams }: Props) {
  const params = await searchParams
  const result = await verify(params.session_id)

  return (
    <div className="min-h-screen overflow-y-auto flex items-center justify-center px-6" style={{ background: '#07070b' }}>
      <div className="w-full max-w-md text-center border border-white/10 bg-white/[0.03] px-8 py-12">
        <CheckCircle2 className="mx-auto mb-5 text-[#FF6B35]" size={48} />
        <h1
          className="text-4xl uppercase text-white"
          style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
        >
          {result?.paid ? 'You\'re in' : 'Payment received'}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          {result?.email
            ? `Confirmation heading to ${result.email}.`
            : 'Your Stripe checkout completed. Check your email for the receipt.'}
          {result?.quantity ? ` ${result.quantity} ticket${result.quantity > 1 ? 's' : ''} secured.` : ''}
        </p>
        <Link
          href="/worlds/stage"
          className="mt-8 inline-flex px-6 py-3 text-xs font-black uppercase tracking-[0.2em]"
          style={{ background: '#FF6B35', color: '#0A0A0A' }}
        >
          Back to shows
        </Link>
      </div>
    </div>
  )
}
