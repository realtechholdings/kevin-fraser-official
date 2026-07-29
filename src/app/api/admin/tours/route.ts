import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Tour from '@/lib/models/Tour'
import { requireAdmin } from '@/lib/admin'
import { serializeTour } from '@/lib/serialize'
import { slugify } from '@/lib/format'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    await dbConnect()
    const tours = await Tour.find().sort({ featured: -1, createdAt: -1 })
    return NextResponse.json({ success: true, tours: tours.map(serializeTour) })
  } catch (error) {
    console.error('Admin tours GET:', error)
    const message =
      error instanceof Error && (error.message.includes('ENOTFOUND') || error.message.includes('querySrv'))
        ? 'Database unreachable. Check MONGODB_URI / Atlas cluster status.'
        : 'Failed to load tours.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const body = await req.json()
    const title = String(body.title || '').trim()
    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required.' }, { status: 400 })
    }

    const slug = slugify(String(body.slug || title))
    await dbConnect()

    if (body.featured) {
      await Tour.updateMany({}, { featured: false })
    }

    const tour = await Tour.create({
      title,
      slug,
      subtitle: String(body.subtitle || ''),
      description: String(body.description || ''),
      coverImage: String(body.coverImage || ''),
      coverImageKey: String(body.coverImageKey || ''),
      bannerImage: String(body.bannerImage || ''),
      bannerImageKey: String(body.bannerImageKey || ''),
      featured: Boolean(body.featured),
      published: body.published !== false,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    })

    let dirty = false
    if (tour.coverImageKey && !tour.coverImage) {
      tour.coverImage = `/api/tours/${tour._id}/cover`
      dirty = true
    }
    if (tour.bannerImageKey && !tour.bannerImage) {
      tour.bannerImage = `/api/tours/${tour._id}/banner`
      dirty = true
    }
    if (dirty) await tour.save()

    return NextResponse.json({ success: true, tour: serializeTour(tour) }, { status: 201 })
  } catch (error) {
    console.error('Admin tours POST:', error)
    const message =
      error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 11000
        ? 'A tour with that slug already exists.'
        : 'Failed to create tour.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
