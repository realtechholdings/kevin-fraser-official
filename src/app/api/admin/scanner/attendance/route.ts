import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import Order from '@/lib/models/Order'

/** Live check-in stats for one show: totals and per-tier breakdown. */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  const showId = req.nextUrl.searchParams.get('showId') || ''
  if (!mongoose.isValidObjectId(showId)) {
    return NextResponse.json({ success: false, error: 'showId is required.' }, { status: 400 })
  }

  try {
    await dbConnect()
    const orders = await Order.find({ show: showId, status: 'paid' })

    let sold = 0
    let checkedIn = 0
    const tiers = new Map<string, { sold: number; checkedIn: number }>()

    for (const order of orders) {
      const tierName = order.tierName || 'General Admission'
      const entry = tiers.get(tierName) || { sold: 0, checkedIn: 0 }
      entry.sold += order.quantity
      entry.checkedIn += (order.checkedIn || []).length
      tiers.set(tierName, entry)
      sold += order.quantity
      checkedIn += (order.checkedIn || []).length
    }

    return NextResponse.json({
      success: true,
      attendance: {
        sold,
        checkedIn,
        tiers: Array.from(tiers, ([name, counts]) => ({ name, ...counts })).sort(
          (a, b) => b.sold - a.sold,
        ),
      },
    })
  } catch (error) {
    console.error('Scanner attendance GET:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load attendance.' },
      { status: 500 },
    )
  }
}
