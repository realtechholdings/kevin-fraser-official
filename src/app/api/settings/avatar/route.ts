import { NextResponse } from 'next/server'
import { getSiteSettings } from '@/lib/settings/getSiteSettings'
import { createR2DownloadUrl, isR2Configured, publicUrlForKey } from '@/lib/r2'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (!isR2Configured()) {
      return NextResponse.json({ success: false, error: 'R2 is not configured.' }, { status: 503 })
    }

    const settings = await getSiteSettings({ bypassCache: true })
    const key = settings.ai.avatarKey
    if (!key) {
      return NextResponse.json({ success: false, error: 'No avatar set.' }, { status: 404 })
    }

    const publicUrl = publicUrlForKey(key)
    if (publicUrl) return NextResponse.redirect(publicUrl, 302)

    const signed = await createR2DownloadUrl(key)
    return NextResponse.redirect(signed, 302)
  } catch (error) {
    console.error('Settings avatar GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load avatar.' }, { status: 500 })
  }
}
