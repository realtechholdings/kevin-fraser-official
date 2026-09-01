import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Show, { SHOW_STATUSES } from '@/lib/models/Show'
import Tour from '@/lib/models/Tour'
import { requireAdmin } from '@/lib/admin'
import { serializeShow } from '@/lib/serialize'
import { normalizeCurrency } from '@/lib/currencies'
import { applyShowTierConfigs } from '@/lib/tickets/applyTierConfigs'
import { applyShowTableConfigs } from '@/lib/tickets/tables'
import { maybeMarkShowSoldOut } from '@/lib/tickets/maybeMarkShowSoldOut'
import { parseWallDate } from '@/lib/wallDate'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    await dbConnect()
    const shows = await Show.find().populate('tour').sort({ date: 1 })
    return NextResponse.json({ success: true, shows: shows.map((show) => serializeShow(show)) })
  } catch (error) {
    console.error('Admin shows GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load shows.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const body = await req.json()
    const tourId = String(body.tourId || '')
    const title = String(body.title || '').trim()
    const city = String(body.city || '').trim()
    const venue = String(body.venue || '').trim()
    const country = String(body.country || '').trim()
    const date = body.date ? parseWallDate(body.date) : null

    if (!tourId || !title || !city || !venue || !country || !date || Number.isNaN(date.getTime())) {
      return NextResponse.json(
        { success: false, error: 'tourId, title, city, venue, country, and date are required.' },
        { status: 400 }
      )
    }

    await dbConnect()
    const tour = await Tour.findById(tourId)
    if (!tour) {
      return NextResponse.json({ success: false, error: 'Tour not found.' }, { status: 404 })
    }

    const status = SHOW_STATUSES.includes(body.status as (typeof SHOW_STATUSES)[number])
      ? body.status
      : 'on_sale'

    const show = await Show.create({
      tour: tourId,
      title,
      date,
      doorsTime: String(body.doorsTime || ''),
      showTime: String(body.showTime || ''),
      showEndTime: String(body.showEndTime || ''),
      country,
      city,
      venue,
      address: String(body.address || ''),
      currency: normalizeCurrency(body.currency),
      priceCents: Math.max(0, Number(body.priceCents) || 0),
      capacity: Math.max(0, Number(body.capacity) || 0),
      status,
      ticketsOnSaleAt: body.ticketsOnSaleAt
        ? parseWallDate(body.ticketsOnSaleAt) || undefined
        : undefined,
      featured: Boolean(body.featured),
      published: body.published !== false,
      externalTicketUrl: String(body.externalTicketUrl || ''),
      artworkImage: String(body.artworkImage || ''),
      artworkImageKey: String(body.artworkImageKey || ''),
      artworkPosition: String(body.artworkPosition || 'center center').trim() || 'center center',
      listImage: String(body.listImage || ''),
      listImageKey: String(body.listImageKey || ''),
      venueImage: String(body.venueImage || ''),
      venueImageKey: String(body.venueImageKey || ''),
      description: String(body.description || '').trim(),
    })

    let dirty = false
    if (show.artworkImageKey && !show.artworkImage) {
      show.artworkImage = `/api/shows/${show._id}/artwork`
      dirty = true
    }
    if (show.listImageKey && !show.listImage) {
      show.listImage = `/api/shows/${show._id}/list`
      dirty = true
    }
    if (show.venueImageKey && !show.venueImage) {
      show.venueImage = `/api/shows/${show._id}/venue`
      dirty = true
    }
    if (dirty) await show.save()

    if (Array.isArray(body.tierConfigs)) {
      await applyShowTierConfigs(String(show._id), tourId, body.tierConfigs)
    }
    if (Array.isArray(body.tableConfigs)) {
      await applyShowTableConfigs(String(show._id), body.tableConfigs)
    }

    if (status === 'on_sale') {
      await maybeMarkShowSoldOut(String(show._id))
    }

    const fresh = await Show.findById(show._id).populate('tour')
    return NextResponse.json(
      { success: true, show: serializeShow(fresh || show) },
      { status: 201 },
    )
  } catch (error) {
    console.error('Admin shows POST:', error)
    return NextResponse.json({ success: false, error: 'Failed to create show.' }, { status: 500 })
  }
}
