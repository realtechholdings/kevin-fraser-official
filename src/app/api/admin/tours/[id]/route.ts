import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Tour, { TOUR_BANNER_POSITIONS } from '@/lib/models/Tour'
import Show from '@/lib/models/Show'
import { requireAdmin } from '@/lib/admin'
import { serializeTour } from '@/lib/serialize'
import { slugify } from '@/lib/format'

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

    const tour = await Tour.findById(id)
    if (!tour) {
      return NextResponse.json({ success: false, error: 'Tour not found.' }, { status: 404 })
    }

    if (body.title !== undefined) tour.title = String(body.title).trim()
    if (body.slug !== undefined) tour.slug = slugify(String(body.slug))
    if (body.subtitle !== undefined) tour.subtitle = String(body.subtitle)
    if (body.description !== undefined) tour.description = String(body.description)
    if (body.coverImage !== undefined) tour.coverImage = String(body.coverImage)
    if (body.coverImageKey !== undefined) tour.coverImageKey = String(body.coverImageKey)
    if (body.bannerImage !== undefined) tour.bannerImage = String(body.bannerImage)
    if (body.bannerImageKey !== undefined) tour.bannerImageKey = String(body.bannerImageKey)
    if (body.bannerPosition !== undefined) {
      const position = String(body.bannerPosition)
      if (!TOUR_BANNER_POSITIONS.includes(position as (typeof TOUR_BANNER_POSITIONS)[number])) {
        return NextResponse.json(
          { success: false, error: 'bannerPosition must be background or above.' },
          { status: 400 },
        )
      }
      tour.bannerPosition = position as (typeof TOUR_BANNER_POSITIONS)[number]
    }
    if (body.published !== undefined) tour.published = Boolean(body.published)
    if (body.startDate !== undefined) {
      tour.startDate = body.startDate ? new Date(body.startDate) : undefined
    }
    if (body.endDate !== undefined) {
      tour.endDate = body.endDate ? new Date(body.endDate) : undefined
    }
    if (body.featured !== undefined) {
      if (body.featured) {
        await Tour.updateMany({ _id: { $ne: tour._id } }, { featured: false })
      }
      tour.featured = Boolean(body.featured)
    }

    await tour.save()
    return NextResponse.json({ success: true, tour: serializeTour(tour) })
  } catch (error) {
    console.error('Admin tours PATCH:', error)
    return NextResponse.json({ success: false, error: 'Failed to update tour.' }, { status: 500 })
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
    const tour = await Tour.findByIdAndDelete(id)
    if (!tour) {
      return NextResponse.json({ success: false, error: 'Tour not found.' }, { status: 404 })
    }
    await Show.deleteMany({ tour: id })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin tours DELETE:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete tour.' }, { status: 500 })
  }
}
