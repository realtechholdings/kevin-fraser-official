import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Show from '@/lib/models/Show'
import { createR2DownloadUrl, isR2Configured, publicUrlForKey } from '@/lib/r2'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json({ success: false, error: 'R2 is not configured.' }, { status: 503 })
    }

    const { id } = await params
    await dbConnect()
    const show = await Show.findById(id)
    if (!show || !show.listImageKey) {
      return NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 })
    }

    const publicUrl = publicUrlForKey(show.listImageKey)
    if (publicUrl) return NextResponse.redirect(publicUrl, 302)

    const signed = await createR2DownloadUrl(show.listImageKey)
    return NextResponse.redirect(signed, 302)
  } catch (error) {
    console.error('Show list image GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load image.' }, { status: 500 })
  }
}
