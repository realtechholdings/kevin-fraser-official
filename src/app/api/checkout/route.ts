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
import TicketTable from '@/lib/models/TicketTable'
import { findTierForShowSlug, isTableOffering } from '@/lib/tickets/tables'
import { normalizeCheckoutEmail } from '@/lib/email/address'
import { stripeShowCopy, stripContactNumbers } from '@/lib/tickets/stripeCopy'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const showId = String(body.showId || '')
    const tierId = String(body.tierId || '')
    const quantity = Math.max(1, Math.min(MAX_TICKET_QUANTITY, Number(body.quantity) || 1))
    const email = normalizeCheckoutEmail(body.email)

    if (!showId) {
      return NextResponse.json({ success: false, error: 'Show is required.' }, { status: 400 })
    }
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Enter your email so we can send your tickets.' },
        { status: 400 },
      )
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

    const selected = tierId
      ? tiers.find((t) => t.id === tierId)
      : tiers[0]

    if (tierId && !selected) {
      return NextResponse.json(
        { success: false, error: 'This ticket class is not available for this show.' },
        { status: 400 },
      )
    }

    if (!selected) {
      return NextResponse.json({ success: false, error: 'No ticket tier available.' }, { status: 400 })
    }

    if (isTierSoldOut(selected)) {
      return NextResponse.json({ success: false, error: 'This ticket tier is sold out.' }, { status: 400 })
    }

    const tablePurchase = isTableOffering(selected)
    const seats = tablePurchase ? Math.max(1, selected.seats || 1) : 1
    const tableQty = tablePurchase ? quantity : 0
    const ticketQty = tablePurchase ? tableQty * seats : quantity
    if (ticketQty > MAX_TICKET_QUANTITY) {
      return NextResponse.json(
        { success: false, error: `A table purchase cannot exceed ${MAX_TICKET_QUANTITY} tickets.` },
        { status: 400 },
      )
    }

    const tourId =
      show.tour && typeof show.tour === 'object' && '_id' in show.tour
        ? String((show.tour as { _id: unknown })._id)
        : String(show.tour)

    let tableDoc = null
    let underlying = selected
    if (tablePurchase) {
      tableDoc = await TicketTable.findById(selected.id)
      if (!tableDoc || String(tableDoc.show) !== String(show._id) || !tableDoc.published) {
        return NextResponse.json(
          { success: false, error: 'This table is not available for this show.' },
          { status: 400 },
        )
      }
      if (tableDoc.capacity > 0 && tableDoc.tablesSold + tableQty > tableDoc.capacity) {
        return NextResponse.json(
          { success: false, error: 'Not enough tables left.' },
          { status: 400 },
        )
      }
      const linked = await findTierForShowSlug(String(show._id), tourId, tableDoc.tierSlug)
      if (!linked) {
        return NextResponse.json(
          { success: false, error: 'This table is missing its ticket class.' },
          { status: 400 },
        )
      }
      if (linked.capacity > 0 && linked.ticketsSold + ticketQty > linked.capacity) {
        return NextResponse.json(
          { success: false, error: 'Not enough tickets left in this class.' },
          { status: 400 },
        )
      }
      underlying = linked
    } else if (selected.capacity > 0 && selected.ticketsSold + quantity > selected.capacity) {
      return NextResponse.json({ success: false, error: 'Not enough tickets left in this tier.' }, { status: 400 })
    }

    const copy = stripeShowCopy(show)
    const className = stripContactNumbers(selected.name)
    const stripeQuantity = tablePurchase ? tableQty : quantity
    const unitAmount = selected.priceCents
    const lineName = tablePurchase
      ? `${copy.tourTitle} — ${copy.city} (${className}, ${seats} tickets)`
      : `${copy.tourTitle} — ${copy.city} (${className})`

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
        customer_email: email,
        payment_intent_data: {
          description: lineName,
        },
        line_items: [
          {
            quantity: stripeQuantity,
            price_data: {
              currency: selected.currency.toLowerCase(),
              unit_amount: unitAmount,
              product_data: {
                name: lineName,
                description: copy.lineDescription,
              },
            },
          },
        ],
        metadata: {
          showId: String(show._id),
          tierId: tablePurchase ? String(underlying.id) : selected.legacy ? '' : selected.id,
          tierName: selected.name,
          quantity: String(ticketQty),
          tableId: tableDoc ? String(tableDoc._id) : '',
          tableQuantity: String(tableQty || ''),
          email,
        },
      },
      stripeRequestOptions()
    )

    await Order.create({
      show: show._id,
      tier: await ensureShowScopedTierId(String(show._id), underlying),
      tierName: selected.name,
      unitAmountCents: unitAmount,
      stripeSessionId: session.id,
      email,
      quantity: ticketQty,
      amountTotal: unitAmount * stripeQuantity,
      currency: selected.currency,
      status: 'pending',
      source: 'stripe',
      table: tableDoc?._id || null,
      tableQuantity: tableQty,
      tableSeats: tablePurchase ? seats : 0,
      tableNames: [],
    })

    return NextResponse.json({ success: true, url: session.url, sessionId: session.id })
  } catch (error) {
    console.error('Checkout error:', error)
    const message = error instanceof Error ? error.message : 'Checkout failed.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
