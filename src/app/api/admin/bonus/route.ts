import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import BonusContent from '@/lib/models/BonusContent'
import { requireAdmin } from '@/lib/admin'
import { serializeBonusContent } from '@/lib/serialize'
import { isR2Configured } from '@/lib/r2'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    await dbConnect()
    const items = await BonusContent.find().sort({ sortOrder: 1, createdAt: -1 })
    return NextResponse.json({
      success: true,
      r2Configured: isR2Configured(),
      items: items.map(serializeBonusContent),
    })
  } catch (error) {
    console.error('Admin bonus GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load bonus content.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      { success: false, error: 'Cloudflare R2 is not configured.' },
      { status: 503 },
    )
  }

  try {
    const body = await req.json()
    const title = String(body.title || '').trim()
    const mediaKey = String(body.mediaKey || '').trim()
    const mimeType = String(body.mimeType || '').trim()

    if (!title || !mediaKey || !mimeType) {
      return NextResponse.json(
        { success: false, error: 'title, mediaKey, and mimeType are required.' },
        { status: 400 },
      )
    }

    await dbConnect()
    const item = await BonusContent.create({
      title,
      description: String(body.description || '').trim(),
      mediaKey,
      mediaUrl: String(body.mediaUrl || '').trim() || `r2://${mediaKey}`,
      thumbnailKey: String(body.thumbnailKey || '').trim(),
      thumbnailUrl: String(body.thumbnailUrl || '').trim(),
      mimeType,
      sizeBytes: Math.max(0, Number(body.sizeBytes) || 0),
      sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
      featured: Boolean(body.featured),
      published: body.published !== false,
    })

    // Prefer stable app proxy URLs when the bucket is private (no R2_PUBLIC_BASE_URL).
    if (!String(body.mediaUrl || '').trim()) {
      item.mediaUrl = `/api/bonus/${item._id}/file`
      if (item.thumbnailKey && !item.thumbnailUrl) {
        item.thumbnailUrl = `/api/bonus/${item._id}/thumbnail`
      }
      await item.save()
    }

    return NextResponse.json({ success: true, item: serializeBonusContent(item) }, { status: 201 })
  } catch (error) {
    console.error('Admin bonus POST:', error)
    return NextResponse.json({ success: false, error: 'Failed to create bonus content.' }, { status: 500 })
  }
}
