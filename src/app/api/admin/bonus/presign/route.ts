import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { bonusMediaKey, createBonusUploadUrl, isR2Configured } from '@/lib/r2'

const ALLOWED_PREFIXES = ['video/', 'image/', 'audio/']

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
          'Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_BASE_URL.',
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
        { success: false, error: 'Only video, image, and audio uploads are allowed.' },
        { status: 400 },
      )
    }

    const key = bonusMediaKey(filename)
    const upload = await createBonusUploadUrl({ key, contentType })

    return NextResponse.json({
      success: true,
      key: upload.key,
      uploadUrl: upload.uploadUrl,
      // Prefer public URL when configured; otherwise admin create stores key and
      // the public showreel serves via /api/bonus/[id]/file signed redirects.
      publicUrl: upload.publicUrl || '',
    })
  } catch (error) {
    console.error('Admin bonus presign:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create upload URL.',
      },
      { status: 500 },
    )
  }
}
