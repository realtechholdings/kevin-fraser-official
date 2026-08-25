import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Show from '@/lib/models/Show'
// Registers the Tour schema so .populate('tour') works in this route
import '@/lib/models/Tour'
import Order from '@/lib/models/Order'
import { checkoutReturnUrl, getStripe, stripeRequestOptions } from '@/lib/stripe'
import { resolveTiersForShow } from '@/lib/tickets/resolveTiers'
import { areAllTiersSoldOut, isTierSoldOut } from '@/lib/tickets/soldOut'
import { MAX_TICKET_QUANTITY } from '@/lib/tickets/limits'
import { ensureShowScopedTierId } from '@/lib/tickets/applyTierConfigs'
import { toWallInput } from '@/lib/wallDate'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const showId = String(body.showId || '')
    const tierId = String(body.tierId || '')
    const quantity = Math.max(1, Math.min(MAX_TICKET_QUANTITY, Number(body.quantity) || 1))

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

    const tiers = await resolveTiersForShow(show)
    if (areAllTiersSoldOut(tiers)) {
      return NextResponse.json({ success: false, error: 'This show is sold out.' }, { status: 400 })
    }

    const selected =
      (tierId && tiers.find((t) => t.id === tierId)) ||
      tiers[0]

    if (!selected) {
      return NextResponse.json({ success: false, error: 'No ticket tier available.' }, { status: 400 })
    }

    if (isTierSoldOut(selected)) {
      return NextResponse.json({ success: false, error: 'This ticket tier is sold out.' }, { status: 400 })
    }
    if (selected.capacity > 0 && selected.ticketsSold + quantity > selected.capacity) {
      return NextResponse.json({ success: false, error: 'Not enough tickets left in this tier.' }, { status: 400 })
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
    const returnBase = checkoutReturnUrl(req)
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        // Show buyers their local currency at checkout (charge stays in the show's currency)
        adaptive_pricing: { enabled: true },
        success_url: `${returnBase}/worlds/stage/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${returnBase}/worlds/stage?cancelled=1`,
        customer_email: typeof body.email === 'string' ? body.email : undefined,
        line_items: [
          {
            quantity,
            price_data: {
              currency: selected.currency.toLowerCase(),
              unit_amount: selected.priceCents,
              product_data: {
                name: `${tourTitle} — ${show.city} (${selected.name})`,
                description: `${show.venue} · ${toWallInput(show.date).replace('T', ' ')}`,
              },
            },
          },
        ],
        metadata: {
          showId: String(show._id),
          tierId: selected.legacy ? '' : selected.id,
          tierName: selected.name,
          quantity: String(quantity),
        },
      },
      stripeRequestOptions()
    )

    await Order.create({
      show: show._id,
      tier: await ensureShowScopedTierId(String(show._id), selected),
      tierName: selected.name,
      unitAmountCents: selected.priceCents,
      stripeSessionId: session.id,
      email: session.customer_email || body.email || 'pending@checkout',
      quantity,
      amountTotal: selected.priceCents * quantity,
      currency: selected.currency,
      status: 'pending',
      source: 'stripe',
    })

    return NextResponse.json({ success: true, url: session.url, sessionId: session.id })
  } catch (error) {
    console.error('Checkout error:', error)
    const message = error instanceof Error ? error.message : 'Checkout failed.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
