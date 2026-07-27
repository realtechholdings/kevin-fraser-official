import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import SiteSettings from '@/lib/models/SiteSettings'
import { requireAdmin } from '@/lib/admin'
import { isR2Configured } from '@/lib/r2'
import {
  DEFAULT_AI_SETTINGS,
  DEFAULT_THEME_SETTINGS,
  SITE_SETTINGS_KEY,
  normalizeHex,
} from '@/lib/settings/defaults'
import { getSiteSettings, invalidateSiteSettingsCache } from '@/lib/settings/getSiteSettings'
import { toSiteSettingsData } from '@/lib/models/SiteSettings'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const settings = await getSiteSettings({ bypassCache: true })
    return NextResponse.json({
      success: true,
      r2Configured: isR2Configured(),
      settings,
      defaults: {
        theme: DEFAULT_THEME_SETTINGS,
        ai: {
          ...DEFAULT_AI_SETTINGS,
          // Don't dump huge default prompt twice unnecessarily in UI seed — still useful:
          systemPrompt: DEFAULT_AI_SETTINGS.systemPrompt,
        },
      },
    })
  } catch (error) {
    console.error('Admin settings GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load settings.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const body = await req.json()
    await dbConnect()

    let doc = await SiteSettings.findOne({ key: SITE_SETTINGS_KEY })
    if (!doc) {
      doc = await SiteSettings.create({
        key: SITE_SETTINGS_KEY,
        theme: DEFAULT_THEME_SETTINGS,
        ai: DEFAULT_AI_SETTINGS,
      })
    }

    if (body.theme) {
      const t = body.theme
      doc.theme = {
        lightAccent: normalizeHex(String(t.lightAccent || ''), DEFAULT_THEME_SETTINGS.lightAccent),
        lightAccentContrast: normalizeHex(
          String(t.lightAccentContrast || ''),
          DEFAULT_THEME_SETTINGS.lightAccentContrast,
        ),
        darkAccent: normalizeHex(String(t.darkAccent || ''), DEFAULT_THEME_SETTINGS.darkAccent),
        darkAccentContrast: normalizeHex(
          String(t.darkAccentContrast || ''),
          DEFAULT_THEME_SETTINGS.darkAccentContrast,
        ),
      }
      doc.markModified('theme')
    }

    if (body.ai) {
      const a = body.ai
      doc.ai = {
        displayName: String(a.displayName ?? doc.ai.displayName ?? DEFAULT_AI_SETTINGS.displayName).trim() ||
          DEFAULT_AI_SETTINGS.displayName,
        greeting:
          String(a.greeting ?? doc.ai.greeting ?? DEFAULT_AI_SETTINGS.greeting).trim() ||
          DEFAULT_AI_SETTINGS.greeting,
        systemPrompt:
          String(a.systemPrompt ?? doc.ai.systemPrompt ?? DEFAULT_AI_SETTINGS.systemPrompt).trim() ||
          DEFAULT_AI_SETTINGS.systemPrompt,
        vocabularyNotes: String(a.vocabularyNotes ?? doc.ai.vocabularyNotes ?? '').trim(),
        avatarKey: String(a.avatarKey ?? doc.ai.avatarKey ?? '').trim(),
        avatarUrl: String(a.avatarUrl ?? doc.ai.avatarUrl ?? '').trim(),
      }
      if (doc.ai.avatarKey && !doc.ai.avatarUrl) {
        doc.ai.avatarUrl = '/api/settings/avatar'
      }
      doc.markModified('ai')
    }

    await doc.save()
    invalidateSiteSettingsCache()
    const settings = toSiteSettingsData(doc)

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Admin settings PUT:', error)
    return NextResponse.json({ success: false, error: 'Failed to save settings.' }, { status: 500 })
  }
}
