import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import StudioContent from '@/lib/models/StudioContent'
import { requireAdmin } from '@/lib/admin'
import { serializeStudioContent } from '@/lib/serialize'
import { isR2Configured } from '@/lib/r2'
import { getSiteSettings } from '@/lib/settings/getSiteSettings'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const settings = await getSiteSettings({ bypassCache: true })
    await dbConnect()
    const items = await StudioContent.find().sort({ category: 1, sortOrder: 1, createdAt: -1 })
    return NextResponse.json({
      success: true,
      r2Configured: isR2Configured(),
      categories: settings.studio.categories,
      items: items.map(serializeStudioContent),
    })
  } catch (error) {
    console.error('Admin studio GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load studio content.' }, { status: 500 })
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

    if (!title || !mediaKey || !mimeType) {
      return NextResponse.json(
        { success: false, error: 'title, mediaKey, and mimeType are required.' },
        { status: 400 },
      )
    }

    const settings = await getSiteSettings({ bypassCache: true })
    const validIds = new Set(settings.studio.categories.map((c) => c.id))
    if (!validIds.has(category)) {
      return NextResponse.json(
        { success: false, error: 'Choose a valid studio category.' },
        { status: 400 },
      )
    }

    await dbConnect()
    const item = await StudioContent.create({
      title,
      description: String(body.description || '').trim(),
      category,
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

    if (!String(body.mediaUrl || '').trim()) {
      item.mediaUrl = `/api/studio/${item._id}/file`
      if (item.thumbnailKey && !item.thumbnailUrl) {
        item.thumbnailUrl = `/api/studio/${item._id}/thumbnail`
      }
      await item.save()
    }

    return NextResponse.json({ success: true, item: serializeStudioContent(item) }, { status: 201 })
  } catch (error) {
    console.error('Admin studio POST:', error)
    return NextResponse.json({ success: false, error: 'Failed to create studio content.' }, { status: 500 })
  }
}
