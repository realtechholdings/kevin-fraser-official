import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import {
  emailMediaKey,
  isR2Configured,
  putR2Object,
  showMediaKey,
  showreelMediaKey,
  tourMediaKey,
} from '@/lib/r2'

export const runtime = 'nodejs'

const MAX_BYTES = 8 * 1024 * 1024 // 8MB images
const FOLDERS = ['tours', 'shows', 'email', 'showreel'] as const

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
    const folder = String(form.get('folder') || '').trim()

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'file is required.' }, { status: 400 })
    }
    if (!FOLDERS.includes(folder as (typeof FOLDERS)[number])) {
      return NextResponse.json(
        { success: false, error: 'folder must be tours, shows, email, or showreel.' },
        { status: 400 },
      )
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'Only image uploads are allowed.' },
        { status: 400 },
      )
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Image must be 8MB or smaller.' },
        { status: 413 },
      )
    }

    const key =
      folder === 'tours'
        ? tourMediaKey(file.name || 'image.jpg')
        : folder === 'email'
          ? emailMediaKey(file.name || 'image.jpg')
          : folder === 'showreel'
            ? showreelMediaKey(file.name || 'image.jpg')
            : showMediaKey(file.name || 'image.jpg')

    const uploaded = await putR2Object({
      key,
      body: Buffer.from(await file.arrayBuffer()),
      contentType: file.type || 'image/jpeg',
    })

    // Email images are embedded by URL in recipients' inboxes, so they must be
    // publicly reachable — the site's proxy routes won't do.
    if (folder === 'email' && !uploaded.publicUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Email images need a public URL — set R2_PUBLIC_BASE_URL to your R2 public bucket URL.',
        },
        { status: 503 },
      )
    }

    return NextResponse.json({
      success: true,
      key: uploaded.key,
      publicUrl: uploaded.publicUrl || '',
    })
  } catch (error) {
    console.error('Admin media upload:', error)
    const message = error instanceof Error ? error.message : 'Upload failed.'
    const denied = /AccessDenied|access denied|403/i.test(message)
    return NextResponse.json(
      {
        success: false,
        error: denied
          ? 'R2 Access Denied. Give this API token Object Read & Write on the kevin-fraser bucket.'
          : message,
      },
      { status: denied ? 403 : 500 },
    )
  }
}
