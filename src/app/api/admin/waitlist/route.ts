import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import Show from '@/lib/models/Show'
import ShowWaitlist from '@/lib/models/ShowWaitlist'
import '@/lib/models/Tour'
import { formatShowDate } from '@/lib/format'
import { toWallIso } from '@/lib/wallDate'

function csvCell(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(['shows', 'guestlist', 'sales'])
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  const showId = req.nextUrl.searchParams.get('showId') || ''
  const format = req.nextUrl.searchParams.get('format') || ''

  try {
    await dbConnect()
    const filter: Record<string, unknown> = {}
    if (showId && showId !== 'all' && mongoose.isValidObjectId(showId)) filter.show = showId

    const [entries, shows] = await Promise.all([
      ShowWaitlist.find(filter).sort({ createdAt: 1 }).populate({ path: 'show', populate: { path: 'tour' } }),
      Show.find().populate('tour').sort({ date: 1 }),
    ])

    if (format === 'csv') {
      const lines = [['Name', 'Email', 'Joined', 'City', 'Venue', 'Show date', 'Show removed'].join(',')]
      for (const entry of entries) {
        const show = entry.show as {
          city?: string
          venue?: string
          date?: Date
          archivedAt?: Date | null
        } | null
        const date = show?.date ? formatShowDate(toWallIso(show.date) || String(show.date)) : null
        const created = (entry as { createdAt?: Date }).createdAt
        lines.push(
          [
            entry.name,
            entry.email,
            created ? new Date(created).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }) : '',
            show?.city || '',
            show?.venue || '',
            date?.full || '',
            show?.archivedAt ? 'yes' : '',
          ]
            .map((value) => csvCell(String(value)))
            .join(','),
        )
      }
      const body = `\uFEFF${lines.join('\n')}\n`
      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="waitlist.csv"',
          'Cache-Control': 'no-store',
        },
      })
    }

    const counts = new Map<string, number>()
    for (const entry of entries) {
      const id = String((entry.show as { _id?: unknown } | null)?._id || entry.show)
      counts.set(id, (counts.get(id) || 0) + 1)
    }

    return NextResponse.json({
      success: true,
      total: entries.length,
      shows: shows.map((show) => {
        const date = formatShowDate(toWallIso(show.date) || String(show.date))
        return {
          id: String(show._id),
          city: show.city,
          venue: show.venue,
          dateLabel: date.full || '',
          status: show.status,
          waitlistEnabled: show.waitlistEnabled !== false && !show.archivedAt,
          archived: Boolean(show.archivedAt),
          count: counts.get(String(show._id)) || 0,
        }
      }),
      entries: entries.map((entry) => {
        const show = entry.show as { _id?: unknown; city?: string; venue?: string } | null
        const created = (entry as { createdAt?: Date }).createdAt
        return {
          id: String(entry._id),
          name: entry.name,
          email: entry.email,
          createdAt: created ? new Date(created).toISOString() : null,
          showId: show?._id ? String(show._id) : '',
          city: show?.city || '',
          venue: show?.venue || '',
        }
      }),
    })
  } catch (error) {
    console.error('Admin waitlist GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load the waitlist.' }, { status: 500 })
  }
}
