import { NextResponse } from 'next/server'
import { getSiteSettings } from '@/lib/settings/getSiteSettings'
import { createR2DownloadUrl, isR2Configured, publicUrlForKey } from '@/lib/r2'

type Slot = 'intro' | 'intro-mobile'

async function serveConnectVideo(slot: Slot) {
  if (!isR2Configured()) {
    return NextResponse.json({ success: false, error: 'R2 is not configured.' }, { status: 503 })
  }

  const settings = await getSiteSettings({ bypassCache: true })
  const key =
    slot === 'intro-mobile'
      ? settings.connect.introVideoMobileKey
      : settings.connect.introVideoKey

  if (!key) {
    return NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 })
  }

  const publicUrl = publicUrlForKey(key)
  if (publicUrl) return NextResponse.redirect(publicUrl, 302)

  const signed = await createR2DownloadUrl(key)
  return NextResponse.redirect(signed, 302)
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ slot: string }> },
) {
  try {
    const { slot } = await context.params
    if (slot !== 'intro' && slot !== 'intro-mobile') {
      return NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 })
    }
    return await serveConnectVideo(slot)
  } catch (error) {
    console.error('Connect video proxy:', error)
    return NextResponse.json({ success: false, error: 'Failed to load video.' }, { status: 500 })
  }
}
