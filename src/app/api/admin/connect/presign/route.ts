import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { connectMediaKey, createR2UploadUrl, isR2Configured } from '@/lib/r2'

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
    const filename = String(body.filename || '').trim()
    const contentType = String(body.contentType || '').trim()
    if (!filename || !contentType) {
      return NextResponse.json(
        { success: false, error: 'filename and contentType are required.' },
        { status: 400 },
      )
    }
    if (!contentType.startsWith('video/')) {
      return NextResponse.json({ success: false, error: 'Only video uploads are allowed.' }, { status: 400 })
    }

    const key = connectMediaKey(filename)
    const upload = await createR2UploadUrl({ key, contentType })
    return NextResponse.json({
      success: true,
      key: upload.key,
      uploadUrl: upload.uploadUrl,
      publicUrl: upload.publicUrl || '',
    })
  } catch (error) {
    console.error('Connect presign:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create upload URL.' },
      { status: 500 },
    )
  }
}
