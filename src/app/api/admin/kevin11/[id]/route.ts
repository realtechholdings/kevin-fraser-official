import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Kevin11Content, {
  KEVIN11_CATEGORIES,
  KEVIN11_OVERLAY_SLOTS,
} from '@/lib/models/Kevin11Content'
import { requireAdmin } from '@/lib/admin'
import { serializeKevin11Content } from '@/lib/serialize'
import { deleteR2Object, isR2Configured } from '@/lib/r2'

type Params = { params: Promise<{ id: string }> }

async function safeDeleteR2(key: string | undefined | null) {
  if (!key || !isR2Configured()) return
  try {
    await deleteR2Object(key)
  } catch (err) {
    console.error('R2 delete warning:', err)
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const { id } = await params
    const body = await req.json()
    await dbConnect()
    const item = await Kevin11Content.findById(id)
    if (!item) {
      return NextResponse.json({ success: false, error: 'Kevin11 item not found.' }, { status: 404 })
    }

    if (body.title !== undefined) item.title = String(body.title || '').trim()
    if (body.description !== undefined) item.description = String(body.description || '').trim()
    if (body.category !== undefined) {
      const category = String(body.category || '').trim()
      if (!KEVIN11_CATEGORIES.includes(category as (typeof KEVIN11_CATEGORIES)[number])) {
        return NextResponse.json({ success: false, error: 'Invalid category.' }, { status: 400 })
      }
      item.category = category as (typeof KEVIN11_CATEGORIES)[number]
    }
    if (body.ctaLabel !== undefined) item.ctaLabel = String(body.ctaLabel || '').trim()
    if (body.ctaUrl !== undefined) item.ctaUrl = String(body.ctaUrl || '').trim()
    if (body.overlaySlot !== undefined) {
      const overlaySlot = String(body.overlaySlot || 'none').trim()
      if (!KEVIN11_OVERLAY_SLOTS.includes(overlaySlot as (typeof KEVIN11_OVERLAY_SLOTS)[number])) {
        return NextResponse.json({ success: false, error: 'Invalid overlay slot.' }, { status: 400 })
      }
      item.overlaySlot = overlaySlot as (typeof KEVIN11_OVERLAY_SLOTS)[number]
    }
    if (body.sortOrder !== undefined) item.sortOrder = Number(body.sortOrder) || 0
    if (body.featured !== undefined) item.featured = Boolean(body.featured)
    if (body.published !== undefined) item.published = Boolean(body.published)

    if (body.mediaKey !== undefined) {
      const nextKey = String(body.mediaKey || '').trim()
      if (!nextKey) {
        return NextResponse.json({ success: false, error: 'mediaKey cannot be empty.' }, { status: 400 })
      }
      if (nextKey !== item.mediaKey) {
        await safeDeleteR2(item.mediaKey)
        item.mediaKey = nextKey
        item.mediaUrl = String(body.mediaUrl || '').trim() || `/api/kevin11/${item._id}/file`
        if (body.mimeType !== undefined) {
          item.mimeType = String(body.mimeType || '').trim() || item.mimeType
        }
        if (body.sizeBytes !== undefined) {
          item.sizeBytes = Math.max(0, Number(body.sizeBytes) || 0)
        }
      }
    } else {
      if (body.mediaUrl !== undefined) item.mediaUrl = String(body.mediaUrl || '').trim()
      if (body.mimeType !== undefined) {
        const mime = String(body.mimeType || '').trim()
        if (mime) item.mimeType = mime
      }
      if (body.sizeBytes !== undefined) {
        item.sizeBytes = Math.max(0, Number(body.sizeBytes) || 0)
      }
    }

    if (body.thumbnailKey !== undefined || body.thumbnailUrl !== undefined) {
      const nextThumbKey =
        body.thumbnailKey !== undefined
          ? String(body.thumbnailKey || '').trim()
          : item.thumbnailKey || ''
      const nextThumbUrl =
        body.thumbnailUrl !== undefined
          ? String(body.thumbnailUrl || '').trim()
          : item.thumbnailUrl || ''

      if (nextThumbKey !== (item.thumbnailKey || '')) {
        await safeDeleteR2(item.thumbnailKey)
      }

      item.thumbnailKey = nextThumbKey
      item.thumbnailUrl =
        nextThumbKey && !nextThumbUrl
          ? `/api/kevin11/${item._id}/thumbnail`
          : nextThumbUrl
    }

    if (item.category !== 'comedy') {
      item.overlaySlot = 'none'
    }

    if (!item.title) {
      return NextResponse.json({ success: false, error: 'Title is required.' }, { status: 400 })
    }

    await item.save()
    return NextResponse.json({ success: true, item: serializeKevin11Content(item) })
  } catch (error) {
    console.error('Admin Kevin11 PATCH:', error)
    return NextResponse.json({ success: false, error: 'Failed to update Kevin11 content.' }, { status: 500 })
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
    const item = await Kevin11Content.findById(id)
    if (!item) {
      return NextResponse.json({ success: false, error: 'Kevin11 item not found.' }, { status: 404 })
    }

    if (isR2Configured()) {
      try {
        await deleteR2Object(item.mediaKey)
        if (item.thumbnailKey) await deleteR2Object(item.thumbnailKey)
      } catch (err) {
        console.error('R2 delete warning:', err)
      }
    }

    await item.deleteOne()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin Kevin11 DELETE:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete Kevin11 content.' }, { status: 500 })
  }
}
