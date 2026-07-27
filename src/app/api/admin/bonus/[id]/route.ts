import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import BonusContent from '@/lib/models/BonusContent'
import { requireAdmin } from '@/lib/admin'
import { serializeBonusContent } from '@/lib/serialize'
import { deleteR2Object, isR2Configured } from '@/lib/r2'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const { id } = await params
    const body = await req.json()
    await dbConnect()
    const item = await BonusContent.findById(id)
    if (!item) {
      return NextResponse.json({ success: false, error: 'Bonus item not found.' }, { status: 404 })
    }

    if (body.title !== undefined) item.title = String(body.title || '').trim()
    if (body.description !== undefined) item.description = String(body.description || '').trim()
    if (body.sortOrder !== undefined) item.sortOrder = Number(body.sortOrder) || 0
    if (body.featured !== undefined) item.featured = Boolean(body.featured)
    if (body.published !== undefined) item.published = Boolean(body.published)
    if (body.thumbnailKey !== undefined) item.thumbnailKey = String(body.thumbnailKey || '').trim()
    if (body.thumbnailUrl !== undefined) item.thumbnailUrl = String(body.thumbnailUrl || '').trim()

    if (!item.title) {
      return NextResponse.json({ success: false, error: 'Title is required.' }, { status: 400 })
    }

    await item.save()
    return NextResponse.json({ success: true, item: serializeBonusContent(item) })
  } catch (error) {
    console.error('Admin bonus PATCH:', error)
    return NextResponse.json({ success: false, error: 'Failed to update bonus content.' }, { status: 500 })
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
    const item = await BonusContent.findById(id)
    if (!item) {
      return NextResponse.json({ success: false, error: 'Bonus item not found.' }, { status: 404 })
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
    console.error('Admin bonus DELETE:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete bonus content.' }, { status: 500 })
  }
}
