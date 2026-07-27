import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import StudioContent from '@/lib/models/StudioContent'
import { createR2DownloadUrl, isR2Configured, publicUrlForKey } from '@/lib/r2'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json({ success: false, error: 'R2 is not configured.' }, { status: 503 })
    }

    const { id } = await params
    await dbConnect()
    const item = await StudioContent.findById(id)
    if (!item || !item.published || !item.thumbnailKey) {
      return NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 })
    }

    const publicUrl = publicUrlForKey(item.thumbnailKey)
    if (publicUrl) return NextResponse.redirect(publicUrl, 302)

    const signed = await createR2DownloadUrl(item.thumbnailKey)
    return NextResponse.redirect(signed, 302)
  } catch (error) {
    console.error('Studio thumbnail GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load thumbnail.' }, { status: 500 })
  }
}
