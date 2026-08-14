import { NextResponse } from 'next/server'
import { DEFAULT_CONNECT_SETTINGS } from '@/lib/settings/defaults'
import { getSiteSettings } from '@/lib/settings/getSiteSettings'

export async function GET() {
  try {
    const settings = await getSiteSettings()
    return NextResponse.json({
      success: true,
      connect: settings.connect || DEFAULT_CONNECT_SETTINGS,
    })
  } catch (error) {
    console.error('Connect settings GET:', error)
    return NextResponse.json({
      success: true,
      connect: DEFAULT_CONNECT_SETTINGS,
    })
  }
}
