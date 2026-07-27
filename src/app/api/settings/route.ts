import { NextResponse } from 'next/server'
import { getSiteSettings } from '@/lib/settings/getSiteSettings'

export const dynamic = 'force-dynamic'

export async function GET() {
  const settings = await getSiteSettings()
  return NextResponse.json({
    success: true,
    theme: settings.theme,
    ai: {
      displayName: settings.ai.displayName,
      greeting: settings.ai.greeting,
      avatarUrl: settings.ai.avatarUrl || (settings.ai.avatarKey ? '/api/settings/avatar' : ''),
    },
  })
}
