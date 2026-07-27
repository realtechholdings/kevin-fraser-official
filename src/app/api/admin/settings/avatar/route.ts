import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { isR2Configured, putR2Object, settingsMediaKey } from '@/lib/r2'

export const runtime = 'nodejs'

const MAX_BYTES = 5 * 1024 * 1024 // 5MB

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
    const form = await req.formData()
    const file = form.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'file is required.' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'Only image uploads are allowed for the avatar.' },
        { status: 400 },
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Avatar must be 5MB or smaller.' },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const key = settingsMediaKey(file.name || 'avatar.jpg')

    try {
      const uploaded = await putR2Object({
        key,
        body: buffer,
        contentType: file.type || 'image/jpeg',
      })
      return NextResponse.json({
        success: true,
        key: uploaded.key,
        publicUrl: uploaded.publicUrl || '/api/settings/avatar',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'R2 upload failed'
      const denied = /AccessDenied|access denied|403/i.test(message)
      return NextResponse.json(
        {
          success: false,
          error: denied
            ? 'R2 Access Denied. Give this API token Object Read & Write on the kevin-fraser bucket.'
            : `R2 upload failed: ${message}`,
        },
        { status: denied ? 403 : 500 },
      )
    }
  } catch (error) {
    console.error('Admin settings avatar POST:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload avatar.',
      },
      { status: 500 },
    )
  }
}
