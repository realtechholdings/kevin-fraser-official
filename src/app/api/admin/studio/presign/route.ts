import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createR2UploadUrl, isR2Configured, studioMediaKey } from '@/lib/r2'

const ALLOWED_PREFIXES = ['video/', 'image/']

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.',
      },
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

    if (!ALLOWED_PREFIXES.some((prefix) => contentType.startsWith(prefix))) {
      return NextResponse.json(
        { success: false, error: 'Only video and image uploads are allowed.' },
        { status: 400 },
      )
    }

    const key = studioMediaKey(filename)
    const upload = await createR2UploadUrl({ key, contentType })

    return NextResponse.json({
      success: true,
      key: upload.key,
      uploadUrl: upload.uploadUrl,
      publicUrl: upload.publicUrl || '',
    })
  } catch (error) {
    console.error('Admin studio presign:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create upload URL.',
      },
      { status: 500 },
    )
  }
}
