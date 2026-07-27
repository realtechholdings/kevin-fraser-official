import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Tour from '@/lib/models/Tour'
import { serializeTour } from '@/lib/serialize'

export async function GET() {
  try {
    await dbConnect()
    const tours = await Tour.find({ published: true }).sort({ featured: -1, startDate: 1 }).lean()
    return NextResponse.json({
      success: true,
      tours: tours.map((t) => serializeTour(t as never)),
    })
  } catch (error) {
    console.error('Tours GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load tours.' }, { status: 500 })
  }
}
