import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import Order from '@/lib/models/Order'
import Show from '@/lib/models/Show'
import '@/lib/models/Tour'
import { formatShowDate } from '@/lib/format'
import { toWallIso } from '@/lib/wallDate'

export async function GET() {
  const admin = await requireAdmin('cms')
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    await dbConnect()
    const [emails, orders, shows] = await Promise.all([
      Order.distinct('email', { status: 'paid' }) as Promise<string[]>,
      Order.find({ status: 'paid' }).select('show tierName email'),
      Show.find().populate('tour').sort({ date: 1 }),
    ])

    const grouped = new Map<string, Map<string, Set<string>>>()
    for (const order of orders) {
      const showId = String(order.show || '')
      if (!showId) continue
      const tier = order.tierName || 'General Admission'
      const byTier = grouped.get(showId) || new Map<string, Set<string>>()
      const holders = byTier.get(tier) || new Set<string>()
      if (order.email) holders.add(order.email)
      byTier.set(tier, holders)
      grouped.set(showId, byTier)
    }

    return NextResponse.json({
      success: true,
      buyers: emails.sort(),
      count: emails.length,
      shows: shows.map((show) => {
        const date = toWallIso(show.date)
        const d = date ? formatShowDate(date) : null
        const tour =
          show.tour && typeof show.tour === 'object' && 'title' in show.tour
            ? String((show.tour as { title?: string }).title || '')
            : ''
        const byTier = grouped.get(String(show._id)) || new Map<string, Set<string>>()
        const everyone = new Set<string>()
        const tiers = Array.from(byTier, ([name, holders]) => {
          holders.forEach((email) => everyone.add(email))
          return { name, count: holders.size }
        }).sort((a, b) => a.name.localeCompare(b.name))
        return {
          id: String(show._id),
          label: `${show.city} · ${show.venue}${d?.day ? ` · ${d.day} ${d.month}` : ''}${
            tour ? ` (${tour})` : ''
          }`,
          holderCount: everyone.size,
          tiers,
        }
      }),
    })
  } catch (error) {
    console.error('CMS recipients GET:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load recipients.' },
      { status: 500 },
    )
  }
}
