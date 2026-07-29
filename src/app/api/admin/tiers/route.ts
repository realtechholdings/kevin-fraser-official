import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import TicketTier, { TIER_OWNER_TYPES, slugifyTierName } from '@/lib/models/TicketTier'
import Tour from '@/lib/models/Tour'
import Show from '@/lib/models/Show'
import { requireAdmin } from '@/lib/admin'
import { serializeTicketTier } from '@/lib/serialize'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const { searchParams } = new URL(req.url)
    const ownerType = searchParams.get('ownerType')
    const ownerId = searchParams.get('ownerId')

    await dbConnect()
    const query: Record<string, unknown> = {}
    if (ownerType && TIER_OWNER_TYPES.includes(ownerType as (typeof TIER_OWNER_TYPES)[number])) {
      query.ownerType = ownerType
    }
    if (ownerId) query.ownerId = ownerId

    const tiers = await TicketTier.find(query).sort({ ownerType: 1, ownerId: 1, sortOrder: 1, priceCents: 1 })
    return NextResponse.json({ success: true, tiers: tiers.map(serializeTicketTier) })
  } catch (error) {
    console.error('Admin tiers GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load tiers.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const body = await req.json()
    const ownerType = String(body.ownerType || '')
    const ownerId = String(body.ownerId || '')
    const name = String(body.name || '').trim()

    if (!TIER_OWNER_TYPES.includes(ownerType as (typeof TIER_OWNER_TYPES)[number])) {
      return NextResponse.json(
        { success: false, error: 'ownerType must be tour or show.' },
        { status: 400 },
      )
    }
    if (!ownerId || !name) {
      return NextResponse.json(
        { success: false, error: 'ownerId and name are required.' },
        { status: 400 },
      )
    }

    await dbConnect()
    if (ownerType === 'tour') {
      const tour = await Tour.findById(ownerId)
      if (!tour) {
        return NextResponse.json({ success: false, error: 'Tour not found.' }, { status: 404 })
      }
    } else {
      const show = await Show.findById(ownerId)
      if (!show) {
        return NextResponse.json({ success: false, error: 'Show not found.' }, { status: 404 })
      }
    }

    const slug = String(body.slug || '').trim().toLowerCase() || slugifyTierName(name)
    const currency = String(body.currency || 'AUD').toUpperCase()
    const priceCents = Math.max(0, Number(body.priceCents) || 0)

    const tier = await TicketTier.create({
      ownerType: ownerType as (typeof TIER_OWNER_TYPES)[number],
      ownerId,
      name,
      slug,
      description: String(body.description || '').trim(),
      currency,
      priceCents,
      capacity: Math.max(0, Number(body.capacity) || 0),
      sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
      published: body.published !== false,
    })

    return NextResponse.json({ success: true, tier: serializeTicketTier(tier) }, { status: 201 })
  } catch (error) {
    console.error('Admin tiers POST:', error)
    const message = error instanceof Error ? error.message : 'Failed to create tier.'
    const duplicate = /duplicate key/i.test(message)
    return NextResponse.json(
      { success: false, error: duplicate ? 'A tier with that slug already exists for this owner.' : message },
      { status: duplicate ? 409 : 500 },
    )
  }
}
