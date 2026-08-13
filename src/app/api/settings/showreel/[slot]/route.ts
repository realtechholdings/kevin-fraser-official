import { NextResponse } from 'next/server'
import { getSiteSettings } from '@/lib/settings/getSiteSettings'
import { createR2DownloadUrl, isR2Configured, publicUrlForKey } from '@/lib/r2'
import type { ShowreelSettings } from '@/lib/settings/defaults'

export const dynamic = 'force-dynamic'

const SLOTS = ['pageHero', 'reelsBanner', 'bonusBanner'] as const
type Slot = (typeof SLOTS)[number]

type Ctx = { params: Promise<{ slot: string }> }

function isSlot(value: string): value is Slot {
  return SLOTS.includes(value as Slot)
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json({ success: false, error: 'R2 is not configured.' }, { status: 503 })
    }

    const { slot: raw } = await ctx.params
    if (!isSlot(raw)) {
      return NextResponse.json({ success: false, error: 'Unknown showreel image slot.' }, { status: 404 })
    }

    const settings = await getSiteSettings({ bypassCache: true })
    const slot = settings.showreel[raw as keyof ShowreelSettings]
    const key = slot?.imageKey
    if (!key) {
      return NextResponse.json({ success: false, error: 'No image set.' }, { status: 404 })
    }

    const publicUrl = publicUrlForKey(key)
    if (publicUrl) return NextResponse.redirect(publicUrl, 302)

    const signed = await createR2DownloadUrl(key)
    return NextResponse.redirect(signed, 302)
  } catch (error) {
    console.error('Settings showreel GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load showreel image.' }, { status: 500 })
  }
}
