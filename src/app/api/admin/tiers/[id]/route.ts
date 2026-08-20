import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import TicketTier, { slugifyTierName } from '@/lib/models/TicketTier'
import { requireAdmin } from '@/lib/admin'
import { serializeTicketTier } from '@/lib/serialize'
import { maybeMarkShowSoldOut } from '@/lib/tickets/maybeMarkShowSoldOut'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const { id } = await params
    const body = await req.json()
    await dbConnect()
    const tier = await TicketTier.findById(id)
    if (!tier) {
      return NextResponse.json({ success: false, error: 'Tier not found.' }, { status: 404 })
    }

    if (body.name !== undefined) {
      tier.name = String(body.name || '').trim()
      if (!tier.name) {
        return NextResponse.json({ success: false, error: 'Name is required.' }, { status: 400 })
      }
    }
    if (body.slug !== undefined) {
      tier.slug = String(body.slug || '').trim().toLowerCase() || slugifyTierName(tier.name)
    }
    if (body.description !== undefined) tier.description = String(body.description || '').trim()
    if (body.currency !== undefined) tier.currency = String(body.currency || 'AUD').toUpperCase()
    if (body.priceCents !== undefined) {
      tier.priceCents = Math.max(0, Number(body.priceCents) || 0)
      // Editing a show-owned tier’s price means this show no longer follows the tour.
      if (tier.ownerType === 'show') {
        if (body.inheritPrice === undefined) tier.inheritPrice = false
      }
    }
    if (body.inheritPrice !== undefined && tier.ownerType === 'show') {
      tier.inheritPrice = Boolean(body.inheritPrice)
    }
    if (body.capacity !== undefined) tier.capacity = Math.max(0, Number(body.capacity) || 0)
    if (body.sortOrder !== undefined) tier.sortOrder = Number(body.sortOrder) || 0
    if (body.published !== undefined) tier.published = Boolean(body.published)
    if (body.soldOut !== undefined) tier.soldOut = Boolean(body.soldOut)
    if (body.ticketAccent !== undefined) {
      tier.ticketAccent = String(body.ticketAccent || '').trim()
    }
    if (body.ticketArtwork !== undefined) tier.ticketArtwork = String(body.ticketArtwork)
    if (body.ticketArtworkKey !== undefined) {
      tier.ticketArtworkKey = String(body.ticketArtworkKey || '')
      if (tier.ticketArtworkKey && !tier.ticketArtwork) {
        tier.ticketArtwork = `/api/tiers/${tier._id}/ticket-artwork`
      }
    }

    await tier.save()

    if (tier.ownerType === 'show') {
      await maybeMarkShowSoldOut(String(tier.ownerId))
    }

    return NextResponse.json({ success: true, tier: serializeTicketTier(tier) })
  } catch (error) {
    console.error('Admin tiers PATCH:', error)
    const message = error instanceof Error ? error.message : 'Failed to update tier.'
    const duplicate = /duplicate key/i.test(message)
    return NextResponse.json(
      { success: false, error: duplicate ? 'A tier with that slug already exists for this owner.' : message },
      { status: duplicate ? 409 : 500 },
    )
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const { id } = await params
    await dbConnect()
    const tier = await TicketTier.findById(id)
    if (!tier) {
      return NextResponse.json({ success: false, error: 'Tier not found.' }, { status: 404 })
    }
    await tier.deleteOne()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin tiers DELETE:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete tier.' }, { status: 500 })
  }
}
