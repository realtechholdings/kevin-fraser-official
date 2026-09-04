import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import Order from '@/lib/models/Order'
import Show from '@/lib/models/Show'
// Registers schemas for .populate()
import '@/lib/models/Tour'
import { formatShowDate } from '@/lib/format'
import { toWallIso } from '@/lib/wallDate'
import { resolveTiersForShows } from '@/lib/tickets/resolveTiers'
import { isTierSoldOut } from '@/lib/tickets/soldOut'

const MAX_ORDERS_DEFAULT = 500
const MAX_ORDERS_FILTERED = 2000
const MAX_ORDERS_SEARCH = 100

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Mongo filter so resend search can find older sales, names in emails, and Stripe ids. */
function orderSearchClause(raw: string): Record<string, unknown> | null {
  const q = raw.trim()
  if (q.length < 2) return null

  const or: Record<string, unknown>[] = []
  const rx = new RegExp(escapeRegex(q), 'i')
  or.push({ email: rx }, { holderName: rx }, { stripeSessionId: rx }, { stripePaymentIntentId: rx }, { tableNames: rx })

  if (/^[a-f0-9]{24}$/i.test(q)) {
    or.push({ _id: q })
  } else if (/^[a-f0-9]{6,23}$/i.test(q)) {
    or.push({
      $expr: {
        $regexMatch: {
          input: { $toString: '$_id' },
          regex: escapeRegex(q),
          options: 'i',
        },
      },
    })
  }

  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length >= 2) {
    const collapsed = tokens.map(escapeRegex).join('[._+\\s-]*')
    or.push({ email: { $regex: collapsed, $options: 'i' } })
    or.push({ holderName: { $regex: tokens.map((t) => `(?=.*${escapeRegex(t)})`).join(''), $options: 'i' } })
  }

  return { $or: or }
}

function stripeDashboardBase() {
  const testMode = (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_test')
  return testMode ? 'https://dashboard.stripe.com/test' : 'https://dashboard.stripe.com'
}

function parseBound(value: string | null, endOfDay: boolean) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setHours(23, 59, 59, 999)
  }
  return date
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  const showId = req.nextUrl.searchParams.get('showId') || ''
  const from = parseBound(req.nextUrl.searchParams.get('from'), false)
  const to = parseBound(req.nextUrl.searchParams.get('to'), true)
  const search = orderSearchClause(req.nextUrl.searchParams.get('q') || '')
  const exactId = /^[a-f0-9]{24}$/i.test((req.nextUrl.searchParams.get('q') || '').trim())

  try {
    await dbConnect()

    const query: Record<string, unknown> = {}
    if (search) Object.assign(query, search)
    if (showId && mongoose.isValidObjectId(showId) && !exactId) {
      query.show = showId
    }
    // A lookup for resend should not be trapped in the timeline window.
    if (!search && (from || to)) {
      query.createdAt = {
        ...(from ? { $gte: from } : {}),
        ...(to ? { $lte: to } : {}),
      }
    }

    const limit = search
      ? MAX_ORDERS_SEARCH
      : showId || from || to
        ? MAX_ORDERS_FILTERED
        : MAX_ORDERS_DEFAULT

    const [orders, shows] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate({ path: 'show', populate: { path: 'tour' } }),
      Show.find().populate('tour').sort({ date: 1 }),
    ])

    const tiersByShow = await resolveTiersForShows(shows)
    const base = stripeDashboardBase()

    return NextResponse.json({
      success: true,
      truncated: !search && orders.length === limit,
      searched: Boolean(search),
      limit,
      orders: orders.map((order) => {
        const show = order.show as unknown as {
          _id: unknown
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
          quantity: order.quantity,
          tierName: order.tierName || 'General Admission',
          tableQuantity: order.tableQuantity || 0,
          tableSeats: order.tableSeats || 0,
          tableNames: order.tableNames || [],
          amountTotal: order.amountTotal,
          currency: order.currency,
          status: order.status,
          checkedInCount: (order.checkedIn || []).length,
          source: order.source || 'stripe',
          holderName: order.holderName || '',
          confirmationEmailSentAt: order.confirmationEmailSentAt
            ? new Date(order.confirmationEmailSentAt).toISOString()
            : null,
          stripePaymentIntentId: order.stripePaymentIntentId || '',
          stripeUrl: order.stripePaymentIntentId
            ? `${base}/payments/${order.stripePaymentIntentId}`
            : '',
          upgradedFrom: order.upgradedFrom ? String(order.upgradedFrom) : null,
          supersededBy: order.supersededBy ? String(order.supersededBy) : null,
          canUpgrade:
            order.status === 'paid' &&
            !(order.tableQuantity || 0) &&
            !order.table &&
            !(order.checkedIn || []).length &&
            !order.supersededBy,
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
      shows: shows.map((show) => {
        const date = toWallIso(show.date)
        const d = date ? formatShowDate(date) : null
        const tour =
          show.tour && typeof show.tour === 'object' && 'title' in show.tour
            ? String((show.tour as { title?: string }).title || '')
            : ''
        const tiers = tiersByShow[String(show._id)] || []
        return {
          id: String(show._id),
          label: `${show.city} · ${show.venue}${d?.day ? ` · ${d.day} ${d.month}` : ''}${
            tour ? ` (${tour})` : ''
          }`,
          city: show.city,
          venue: show.venue,
          date,
          status: show.status,
          capacity: show.capacity || 0,
          ticketsSold: show.ticketsSold || 0,
          currency: show.currency,
          tour,
          published: show.published !== false,
          tiers: tiers.map((t) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            kind: t.kind || 'ticket',
            seats: t.seats || 1,
            capacity: t.capacity || 0,
            ticketsSold: t.ticketsSold || 0,
            priceCents: t.priceCents,
            currency: t.currency,
            soldOut: isTierSoldOut(t),
          })),
        }
      }),
    })
  } catch (error) {
    console.error('Admin orders GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load orders.' }, { status: 500 })
  }
}
