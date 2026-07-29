import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Show, { SHOW_STATUSES } from '@/lib/models/Show'
import { requireAdmin } from '@/lib/admin'
import { serializeShow } from '@/lib/serialize'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const { id } = await ctx.params
    const body = await req.json()
    await dbConnect()

    const show = await Show.findById(id)
    if (!show) {
      return NextResponse.json({ success: false, error: 'Show not found.' }, { status: 404 })
    }

    if (body.tourId !== undefined) show.tour = body.tourId
    if (body.title !== undefined) show.title = String(body.title).trim()
    if (body.date !== undefined) show.date = new Date(body.date)
    if (body.doorsTime !== undefined) show.doorsTime = String(body.doorsTime)
    if (body.showTime !== undefined) show.showTime = String(body.showTime)
    if (body.country !== undefined) show.country = String(body.country).trim()
    if (body.city !== undefined) show.city = String(body.city).trim()
    if (body.venue !== undefined) show.venue = String(body.venue).trim()
    if (body.address !== undefined) show.address = String(body.address)
    if (body.currency !== undefined) show.currency = String(body.currency).toUpperCase()
    if (body.priceCents !== undefined) show.priceCents = Math.max(0, Number(body.priceCents) || 0)
    if (body.capacity !== undefined) show.capacity = Math.max(0, Number(body.capacity) || 0)
    if (
      body.status !== undefined &&
      SHOW_STATUSES.includes(body.status as (typeof SHOW_STATUSES)[number])
    ) {
      show.status = body.status
    }
    if (body.featured !== undefined) show.featured = Boolean(body.featured)
    if (body.published !== undefined) show.published = Boolean(body.published)
    if (body.externalTicketUrl !== undefined) {
      show.externalTicketUrl = String(body.externalTicketUrl)
    }
    if (body.artworkImage !== undefined) show.artworkImage = String(body.artworkImage)
    if (body.artworkImageKey !== undefined) {
      show.artworkImageKey = String(body.artworkImageKey)
    }
    if (body.venueImage !== undefined) show.venueImage = String(body.venueImage)
    if (body.venueImageKey !== undefined) show.venueImageKey = String(body.venueImageKey)
    if (body.description !== undefined) show.description = String(body.description || '').trim()

    await show.save()
    await show.populate('tour')
    return NextResponse.json({ success: true, show: serializeShow(show) })
  } catch (error) {
    console.error('Admin shows PATCH:', error)
    return NextResponse.json({ success: false, error: 'Failed to update show.' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const { id } = await ctx.params
    await dbConnect()
    const show = await Show.findByIdAndDelete(id)
    if (!show) {
      return NextResponse.json({ success: false, error: 'Show not found.' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin shows DELETE:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete show.' }, { status: 500 })
  }
}
