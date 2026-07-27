import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import BonusContent from '@/lib/models/BonusContent'
import { createBonusDownloadUrl, isR2Configured, publicUrlForKey } from '@/lib/r2'

type Params = { params: Promise<{ id: string }> }

async function redirectToObject(id: string, kind: 'media' | 'thumbnail') {
  if (!isR2Configured()) {
    return NextResponse.json({ success: false, error: 'R2 is not configured.' }, { status: 503 })
  }

  await dbConnect()
  const item = await BonusContent.findById(id)
  if (!item || !item.published) {
    return NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 })
  }

  const key = kind === 'thumbnail' ? item.thumbnailKey : item.mediaKey
  if (!key) {
    return NextResponse.json({ success: false, error: 'File not found.' }, { status: 404 })
  }

  const publicUrl = publicUrlForKey(key)
  if (publicUrl) {
    return NextResponse.redirect(publicUrl, 302)
  }

  const signed = await createBonusDownloadUrl(key)
  return NextResponse.redirect(signed, 302)
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    return await redirectToObject(id, 'media')
  } catch (error) {
    console.error('Bonus file GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load file.' }, { status: 500 })
  }
}
