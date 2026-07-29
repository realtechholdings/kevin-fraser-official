import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Kevin11Content, {
  KEVIN11_CATEGORIES,
  KEVIN11_OVERLAY_SLOTS,
} from '@/lib/models/Kevin11Content'
import { requireAdmin } from '@/lib/admin'
import { serializeKevin11Content } from '@/lib/serialize'
import { isR2Configured } from '@/lib/r2'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    await dbConnect()
    const items = await Kevin11Content.find().sort({ category: 1, sortOrder: 1, createdAt: -1 })
    return NextResponse.json({
      success: true,
      r2Configured: isR2Configured(),
      categories: KEVIN11_CATEGORIES,
      items: items.map(serializeKevin11Content),
    })
  } catch (error) {
    console.error('Admin Kevin11 GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load Kevin11 content.' }, { status: 500 })
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
    const category = String(body.category || '').trim()
    const overlaySlot = String(body.overlaySlot || 'none').trim()

    if (!title || !mediaKey || !mimeType) {
      return NextResponse.json(
        { success: false, error: 'title, mediaKey, and mimeType are required.' },
        { status: 400 },
      )
    }

    if (!KEVIN11_CATEGORIES.includes(category as (typeof KEVIN11_CATEGORIES)[number])) {
      return NextResponse.json(
        { success: false, error: 'category must be comedy, merch, or other.' },
        { status: 400 },
      )
    }

    if (!KEVIN11_OVERLAY_SLOTS.includes(overlaySlot as (typeof KEVIN11_OVERLAY_SLOTS)[number])) {
      return NextResponse.json(
        { success: false, error: 'overlaySlot must be none, left, or right.' },
        { status: 400 },
      )
    }

    // Only comedy can sit in the hero overlays.
    const resolvedSlot =
      category === 'comedy'
        ? (overlaySlot as (typeof KEVIN11_OVERLAY_SLOTS)[number])
        : 'none'

    await dbConnect()
    const item = await Kevin11Content.create({
      title,
      description: String(body.description || '').trim(),
      category: category as (typeof KEVIN11_CATEGORIES)[number],
      mediaKey,
      mediaUrl: String(body.mediaUrl || '').trim() || `r2://${mediaKey}`,
      thumbnailKey: String(body.thumbnailKey || '').trim(),
      thumbnailUrl: String(body.thumbnailUrl || '').trim(),
      mimeType,
      sizeBytes: Math.max(0, Number(body.sizeBytes) || 0),
      ctaLabel: String(body.ctaLabel || '').trim(),
      ctaUrl: String(body.ctaUrl || '').trim(),
      overlaySlot: resolvedSlot,
      sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
      featured: Boolean(body.featured),
      published: body.published !== false,
    })

    if (!String(body.mediaUrl || '').trim()) {
      item.mediaUrl = `/api/kevin11/${item._id}/file`
      if (item.thumbnailKey && !item.thumbnailUrl) {
        item.thumbnailUrl = `/api/kevin11/${item._id}/thumbnail`
      }
      await item.save()
    }

    return NextResponse.json({ success: true, item: serializeKevin11Content(item) }, { status: 201 })
  } catch (error) {
    console.error('Admin Kevin11 POST:', error)
    return NextResponse.json({ success: false, error: 'Failed to create Kevin11 content.' }, { status: 500 })
  }
}
