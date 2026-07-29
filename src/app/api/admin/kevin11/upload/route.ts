import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { isR2Configured, kevin11MediaKey, putR2Object } from '@/lib/r2'

export const runtime = 'nodejs'

/** Stay under typical Vercel serverless body limits; larger files use presigned PUT. */
const MAX_BYTES = 4.5 * 1024 * 1024

const ALLOWED_PREFIXES = ['video/', 'image/']

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

    const contentType = file.type || 'application/octet-stream'
    if (!ALLOWED_PREFIXES.some((prefix) => contentType.startsWith(prefix))) {
      return NextResponse.json(
        { success: false, error: 'Only video and image uploads are allowed.' },
        { status: 400 },
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: 'File too large for server upload. Use direct upload path.',
          code: 'TOO_LARGE',
        },
        { status: 413 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const key = kevin11MediaKey(file.name || 'media')

    try {
      const uploaded = await putR2Object({
        key,
        body: buffer,
        contentType,
      })
      return NextResponse.json({
        success: true,
        key: uploaded.key,
        publicUrl: uploaded.publicUrl || '',
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
    console.error('Admin Kevin11 upload POST:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload file.',
      },
      { status: 500 },
    )
  }
}
