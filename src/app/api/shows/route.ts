import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Show from '@/lib/models/Show'
import { serializeShow } from '@/lib/serialize'

export async function GET(req: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(req.url)
    const tourId = searchParams.get('tourId')
    const tourSlug = searchParams.get('tourSlug')
    const upcoming = searchParams.get('upcoming') !== 'false'
    const featured = searchParams.get('featured') === 'true'

    const filter: Record<string, unknown> = { published: true }
    if (tourId) filter.tour = tourId
    if (featured) filter.featured = true
    if (upcoming) filter.date = { $gte: new Date(Date.now() - 6 * 60 * 60 * 1000) }

    let query = Show.find(filter).populate('tour').sort({ date: 1 })

    if (tourSlug) {
      const Tour = (await import('@/lib/models/Tour')).default
      const tour = await Tour.findOne({ slug: tourSlug, published: true })
      if (!tour) {
        return NextResponse.json({ success: true, shows: [] })
      }
      query = Show.find({ ...filter, tour: tour._id }).populate('tour').sort({ date: 1 })
    }

    const shows = await query.lean()
    return NextResponse.json({
      success: true,
      shows: shows.map((s) => serializeShow(s as never)),
    })
  } catch (error) {
    console.error('Shows GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load shows.' }, { status: 500 })
  }
}
