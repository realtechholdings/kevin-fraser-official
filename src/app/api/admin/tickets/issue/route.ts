import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import Order from '@/lib/models/Order'
import Show from '@/lib/models/Show'
import '@/lib/models/Tour'
import { resolveTiersForShow } from '@/lib/tickets/resolveTiers'
import { isTierSoldOut } from '@/lib/tickets/soldOut'
import { applyPaidInventory } from '@/lib/tickets/fulfillPaidOrder'
import { ensureShowScopedTierId } from '@/lib/tickets/applyTierConfigs'
import { sendTicketEmail } from '@/lib/email/ticket'
import { formatShowDate } from '@/lib/format'
import { toWallIso } from '@/lib/wallDate'

const MAX_QTY = 20

function isLegacyTierId(id: string) {
  return id.startsWith('legacy-')
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    await dbConnect()
    const shows = await Show.find().populate('tour').sort({ date: 1 })
    const options = []

    for (const show of shows) {
      const tiers = await resolveTiersForShow(show)
      const d = formatShowDate(toWallIso(show.date) || String(show.date))
      const tour =
        show.tour && typeof show.tour === 'object' && 'title' in show.tour
          ? String((show.tour as { title?: string }).title || '')
          : ''
      options.push({
        id: String(show._id),
        label: `${show.city} · ${show.venue}${d.day ? ` · ${d.day} ${d.month}` : ''}${
          tour ? ` (${tour})` : ''
        }`,
        city: show.city,
        venue: show.venue,
        date: toWallIso(show.date),
        status: show.status,
        currency: show.currency,
        tiers: tiers.map((t) => ({
          id: t.id,
          name: t.name,
          priceCents: t.priceCents,
          currency: t.currency,
          capacity: t.capacity,
          ticketsSold: t.ticketsSold,
          soldOut: isTierSoldOut(t),
          legacy: Boolean(t.legacy),
        })),
      })
    }

    const recent = await Order.find({ source: 'manual' })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate({ path: 'show', populate: { path: 'tour' } })

    return NextResponse.json({
      success: true,
      shows: options,
      recent: recent.map((order) => {
        const show = order.show as unknown as {
          _id?: unknown
          city?: string
          venue?: string
          date?: Date
          tour?: { title?: string } | null
        } | null
        const doc = order as unknown as { createdAt?: Date }
        return {
          id: String(order._id),
          createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
          email: order.email,
          holderName: order.holderName || '',
          quantity: order.quantity,
          tierName: order.tierName || 'General Admission',
          note: order.note || '',
          confirmationEmailSentAt: order.confirmationEmailSentAt
            ? new Date(order.confirmationEmailSentAt).toISOString()
            : null,
          show: show
            ? {
                id: String(show._id),
                city: show.city || '',
                venue: show.venue || '',
                date: show.date ? toWallIso(show.date) : null,
                tour: show.tour && typeof show.tour === 'object' ? show.tour.title || '' : '',
              }
            : null,
        }
      }),
    })
  } catch (error) {
    console.error('Admin tickets issue GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load ticket options.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const body = await req.json()
    const showId = String(body.showId || '').trim()
    const tierId = String(body.tierId || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const holderName = String(body.holderName || '').trim()
    const note = String(body.note || '').trim().slice(0, 500)
    const quantity = Math.floor(Number(body.quantity) || 0)
    const sendEmail = body.sendEmail !== false
    const countAgainstInventory = body.countAgainstInventory !== false

    if (!showId || !mongoose.isValidObjectId(showId)) {
      return NextResponse.json({ success: false, error: 'Select a show.' }, { status: 400 })
    }
    if (!email.includes('@')) {
      return NextResponse.json({ success: false, error: 'A valid email is required.' }, { status: 400 })
    }
    if (quantity < 1 || quantity > MAX_QTY) {
      return NextResponse.json(
        { success: false, error: `Quantity must be between 1 and ${MAX_QTY}.` },
        { status: 400 },
      )
    }

    await dbConnect()
    const show = await Show.findById(showId).populate('tour')
    if (!show) {
      return NextResponse.json({ success: false, error: 'Show not found.' }, { status: 404 })
    }

    const tiers = await resolveTiersForShow(show)
    const tier =
      (tierId ? tiers.find((t) => t.id === tierId) : null) ||
      tiers[0] ||
      null

    if (!tier) {
      return NextResponse.json({ success: false, error: 'No ticket tier available for this show.' }, { status: 400 })
    }

    if (countAgainstInventory && isTierSoldOut(tier) && !isLegacyTierId(tier.id)) {
      return NextResponse.json(
        { success: false, error: `${tier.name} is sold out. Uncheck inventory, or pick another tier.` },
        { status: 400 },
      )
    }

    if (
      countAgainstInventory &&
      tier.capacity > 0 &&
      tier.ticketsSold + quantity > tier.capacity
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Only ${Math.max(0, tier.capacity - tier.ticketsSold)} left in ${tier.name}.`,
        },
        { status: 400 },
      )
    }

    const realTierId = await ensureShowScopedTierId(String(show._id), tier)

    const orderId = new mongoose.Types.ObjectId()
    const issuedBy =
      admin.emails?.[0] ||
      (admin.user?.emailAddresses?.[0]?.emailAddress || '') ||
      admin.userId

    const order = await Order.create({
      _id: orderId,
      show: show._id,
      tier: realTierId,
      tierName: tier.name,
      unitAmountCents: 0,
      stripeSessionId: `manual_${orderId.toString()}_${Date.now()}`,
      stripePaymentIntentId: '',
      email,
      holderName,
      quantity,
      amountTotal: 0,
      currency: (tier.currency || show.currency || 'AUD').toUpperCase(),
      status: 'paid',
      source: 'manual',
      issuedBy: String(issuedBy),
      note,
      confirmationEmailSentAt: null,
      salesNotifyEmailSentAt: null,
      checkedIn: [],
    })

    if (countAgainstInventory) {
      await applyPaidInventory(order)
    }

    let emailResult: { sent: boolean; skipped?: boolean; error?: string } = { sent: false }
    if (sendEmail) {
      try {
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
          },
          show,
        )
        if (result.skipped) {
          emailResult = { sent: false, skipped: true }
        } else {
          order.confirmationEmailSentAt = new Date()
          await order.save()
          emailResult = { sent: true }
        }
      } catch (err) {
        console.error('Manual ticket email failed:', err)
        emailResult = {
          sent: false,
          error: err instanceof Error ? err.message : 'Email failed',
        }
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: String(order._id),
        email: order.email,
        holderName: order.holderName || '',
        quantity: order.quantity,
        tierName: order.tierName,
      },
      email: emailResult,
    })
  } catch (error) {
    console.error('Admin tickets issue POST:', error)
    const message = error instanceof Error ? error.message : 'Failed to issue tickets.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
