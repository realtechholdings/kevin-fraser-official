import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import Order from '@/lib/models/Order'
// Registers schemas for .populate()
import '@/lib/models/Show'
import '@/lib/models/Tour'
import { toWallIso } from '@/lib/wallDate'

const MAX_ORDERS = 500

function stripeDashboardBase() {
  const testMode = (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_test')
  return testMode ? 'https://dashboard.stripe.com/test' : 'https://dashboard.stripe.com'
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    await dbConnect()
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(MAX_ORDERS)
      .populate({ path: 'show', populate: { path: 'tour' } })

    const base = stripeDashboardBase()

    return NextResponse.json({
      success: true,
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
          amountTotal: order.amountTotal,
          currency: order.currency,
          status: order.status,
          checkedInCount: (order.checkedIn || []).length,
          stripePaymentIntentId: order.stripePaymentIntentId || '',
          stripeUrl: order.stripePaymentIntentId
            ? `${base}/payments/${order.stripePaymentIntentId}`
            : '',
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
    console.error('Admin orders GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load orders.' }, { status: 500 })
  }
}
