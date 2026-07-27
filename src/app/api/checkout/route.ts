import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Show from '@/lib/models/Show'
import Order from '@/lib/models/Order'
import { appUrl, getStripe, stripeRequestOptions } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const showId = String(body.showId || '')
    const quantity = Math.max(1, Math.min(10, Number(body.quantity) || 1))

    if (!showId) {
      return NextResponse.json({ success: false, error: 'Show is required.' }, { status: 400 })
    }

    await dbConnect()
    const show = await Show.findById(showId).populate('tour')
    if (!show || !show.published) {
      return NextResponse.json({ success: false, error: 'Show not found.' }, { status: 404 })
    }

    if (show.status === 'sold_out') {
      return NextResponse.json({ success: false, error: 'This show is sold out.' }, { status: 400 })
    }
    if (show.status === 'cancelled') {
      return NextResponse.json({ success: false, error: 'This show has been cancelled.' }, { status: 400 })
    }
    if (show.status === 'coming_soon') {
      return NextResponse.json({ success: false, error: 'Tickets are not on sale yet.' }, { status: 400 })
    }
    if (new Date(show.date).getTime() < Date.now() - 3 * 60 * 60 * 1000) {
      return NextResponse.json({ success: false, error: 'This show has already happened.' }, { status: 400 })
    }

    if (show.externalTicketUrl) {
      return NextResponse.json({ success: true, url: show.externalTicketUrl, external: true })
    }

    const tourTitle =
      show.tour && typeof show.tour === 'object' && 'title' in show.tour
        ? String((show.tour as { title: string }).title)
        : show.title

    if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_org_') && !process.env.STRIPE_CONTEXT && !process.env.STRIPE_ACCOUNT_ID) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Stripe organization keys require STRIPE_CONTEXT (your acct_… sandbox account id). Add it to .env.local.',
        },
        { status: 500 }
      )
    }

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        success_url: `${appUrl()}/worlds/stage/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl()}/worlds/stage?cancelled=1`,
        customer_email: typeof body.email === 'string' ? body.email : undefined,
        line_items: [
          {
            quantity,
            price_data: {
              currency: show.currency.toLowerCase(),
              unit_amount: show.priceCents,
              product_data: {
                name: `${tourTitle} — ${show.city}`,
                description: `${show.venue} · ${new Date(show.date).toLocaleString('en-AU', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}`,
              },
            },
          },
        ],
        metadata: {
          showId: String(show._id),
          quantity: String(quantity),
        },
      },
      stripeRequestOptions()
    )

    await Order.create({
      show: show._id,
      stripeSessionId: session.id,
      email: session.customer_email || body.email || 'pending@checkout',
      quantity,
      amountTotal: show.priceCents * quantity,
      currency: show.currency,
      status: 'pending',
    })

    return NextResponse.json({ success: true, url: session.url, sessionId: session.id })
  } catch (error) {
    console.error('Checkout error:', error)
    const message = error instanceof Error ? error.message : 'Checkout failed.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
