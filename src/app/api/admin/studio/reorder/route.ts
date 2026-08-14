import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import StudioContent from '@/lib/models/StudioContent'

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const body = await req.json()
    const orderedIds = Array.isArray(body.orderedIds)
      ? body.orderedIds.map((id: unknown) => String(id || '').trim()).filter(Boolean)
      : []

    if (orderedIds.length === 0) {
      return NextResponse.json({ success: false, error: 'orderedIds required.' }, { status: 400 })
    }

    await dbConnect()

    await Promise.all(
      orderedIds.map((id: string, index: number) =>
        StudioContent.findByIdAndUpdate(id, { $set: { sortOrder: index } }),
      ),
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Studio reorder:', error)
    return NextResponse.json({ success: false, error: 'Reorder failed.' }, { status: 500 })
  }
}
