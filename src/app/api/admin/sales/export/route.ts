import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import Order from '@/lib/models/Order'
import '@/lib/models/Tour'
import { formatShowDate } from '@/lib/format'
import { toWallIso } from '@/lib/wallDate'
import { renderSalesExport, toExportOrder, type SalesExportKind } from '@/lib/tickets/salesExport'

function parseBound(value: string | null, endOfDay: boolean) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setHours(23, 59, 59, 999)
  return date
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin('sales')
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  const kindParam = req.nextUrl.searchParams.get('kind') || 'sales'
  const kind: SalesExportKind =
    kindParam === 'comps' || kindParam === 'refunds' ? kindParam : 'sales'
  const showId = req.nextUrl.searchParams.get('showId') || ''
  const from = parseBound(req.nextUrl.searchParams.get('from'), false)
  const to = parseBound(req.nextUrl.searchParams.get('to'), true)

  try {
    await dbConnect()
    const query: Record<string, unknown> = {}
    if (showId && showId !== 'all' && mongoose.isValidObjectId(showId)) query.show = showId
    if (from || to) {
      query.createdAt = {
        ...(from ? { $gte: from } : {}),
        ...(to ? { $lte: to } : {}),
      }
    }
    if (kind === 'comps') query.source = 'manual'
    if (kind === 'refunds') {
      query.$or = [{ status: 'refunded' }, { refundedCents: { $gt: 0 } }]
    } else if (kind === 'sales') {
      query.status = { $in: ['paid', 'upgraded', 'transferred'] }
    }

    const orders = await Order.find(query)
      .sort({ createdAt: 1 })
      .populate({ path: 'show', populate: { path: 'tour' } })

    const rows = orders.map((order) => {
      const show = order.show as { date?: Date; archivedAt?: Date | null; city?: string; venue?: string } | null
      const date = show?.date ? formatShowDate(toWallIso(show.date) || String(show.date)) : null
      return toExportOrder(
        {
          ...order.toObject(),
          _id: order._id,
          show: show
            ? {
                city: show.city,
                venue: show.venue,
                date: show.date,
                archivedAt: show.archivedAt,
              }
            : null,
        },
        date?.full || '',
      )
    })

    const file = renderSalesExport(kind, rows)
    return new NextResponse(file.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${file.filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Sales export GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to export sales.' }, { status: 500 })
  }
}
