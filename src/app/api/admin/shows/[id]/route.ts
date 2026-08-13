import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Show, { SHOW_STATUSES } from '@/lib/models/Show'
import { requireAdmin } from '@/lib/admin'
import { serializeShow } from '@/lib/serialize'
import { normalizeCurrency } from '@/lib/currencies'
import { applyShowTierConfigs } from '@/lib/tickets/applyTierConfigs'
import { maybeMarkShowSoldOut } from '@/lib/tickets/maybeMarkShowSoldOut'
import { parseWallDate } from '@/lib/wallDate'

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
    if (body.date !== undefined) {
      const date = parseWallDate(body.date)
      if (!date) {
        return NextResponse.json({ success: false, error: 'Invalid date.' }, { status: 400 })
      }
      show.date = date
    }
    if (body.doorsTime !== undefined) show.doorsTime = String(body.doorsTime)
    if (body.showTime !== undefined) show.showTime = String(body.showTime)
    if (body.showEndTime !== undefined) show.showEndTime = String(body.showEndTime)
    if (body.country !== undefined) show.country = String(body.country).trim()
    if (body.city !== undefined) show.city = String(body.city).trim()
    if (body.venue !== undefined) show.venue = String(body.venue).trim()
    if (body.address !== undefined) show.address = String(body.address)
    if (body.currency !== undefined) show.currency = normalizeCurrency(body.currency)
    if (body.priceCents !== undefined) show.priceCents = Math.max(0, Number(body.priceCents) || 0)
    if (body.capacity !== undefined) show.capacity = Math.max(0, Number(body.capacity) || 0)
    if (
      body.status !== undefined &&
      SHOW_STATUSES.includes(body.status as (typeof SHOW_STATUSES)[number])
    ) {
      show.status = body.status
    }
    if (body.ticketsOnSaleAt !== undefined) {
      show.ticketsOnSaleAt = body.ticketsOnSaleAt
        ? parseWallDate(body.ticketsOnSaleAt) || null
        : null
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
    if (body.artworkPosition !== undefined) {
      show.artworkPosition = String(body.artworkPosition || 'center center').trim() || 'center center'
    }
    if (body.listImage !== undefined) show.listImage = String(body.listImage)
    if (body.listImageKey !== undefined) {
      show.listImageKey = String(body.listImageKey)
      if (show.listImageKey && !show.listImage) {
        show.listImage = `/api/shows/${show._id}/list`
      }
    }
    if (body.venueImage !== undefined) show.venueImage = String(body.venueImage)
    if (body.venueImageKey !== undefined) show.venueImageKey = String(body.venueImageKey)
    if (body.description !== undefined) show.description = String(body.description || '').trim()

    await show.save()

    if (Array.isArray(body.tierConfigs)) {
      await applyShowTierConfigs(String(show._id), String(show.tour), body.tierConfigs)
    }

    // Tier capacity edits can exhaust inventory without a sale — sync status.
    // Skip if admin explicitly chose cancelled / coming_soon / sold_out.
    if (body.status === undefined || body.status === 'on_sale') {
      await maybeMarkShowSoldOut(String(show._id))
    }

    const fresh = await Show.findById(show._id).populate('tour')
    if (!fresh) {
      return NextResponse.json({ success: false, error: 'Show not found.' }, { status: 404 })
    }
    return NextResponse.json({ success: true, show: serializeShow(fresh) })
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
