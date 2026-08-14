import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import SiteSettings from '@/lib/models/SiteSettings'
import { requireAdmin } from '@/lib/admin'
import { isR2Configured } from '@/lib/r2'
import {
  DEFAULT_AI_SETTINGS,
  DEFAULT_CONNECT_SETTINGS,
  DEFAULT_LEGAL_SETTINGS,
  DEFAULT_SHOWREEL_SETTINGS,
  DEFAULT_STUDIO_SETTINGS,
  DEFAULT_THEME_SETTINGS,
  SITE_SETTINGS_KEY,
  normalizeConnectSettings,
  normalizeHex,
  normalizeShowreelSettings,
  normalizeStudioSettings,
} from '@/lib/settings/defaults'
import { normalizeLegalSettings } from '@/lib/settings/legalDefaults'
import { getSiteSettings, invalidateSiteSettingsCache } from '@/lib/settings/getSiteSettings'
import { toSiteSettingsData } from '@/lib/models/SiteSettings'
import StudioContent from '@/lib/models/StudioContent'

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
        legal: DEFAULT_LEGAL_SETTINGS,
        showreel: DEFAULT_SHOWREEL_SETTINGS,
        studio: DEFAULT_STUDIO_SETTINGS,
        connect: DEFAULT_CONNECT_SETTINGS,
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
        legal: DEFAULT_LEGAL_SETTINGS,
        showreel: DEFAULT_SHOWREEL_SETTINGS,
        studio: DEFAULT_STUDIO_SETTINGS,
        connect: DEFAULT_CONNECT_SETTINGS,
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
        launcherLabel: String(
          a.launcherLabel ?? (doc.ai as { launcherLabel?: string }).launcherLabel ?? '',
        ).trim(),
        launcherColor: (() => {
          const raw = String(
            a.launcherColor ?? (doc.ai as { launcherColor?: string }).launcherColor ?? '',
          ).trim()
          if (!raw) return ''
          return normalizeHex(raw, '')
        })(),
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

    if (body.legal) {
      const current = toSiteSettingsData(doc).legal
      doc.legal = normalizeLegalSettings({
        terms: body.legal.terms ? { ...current.terms, ...body.legal.terms } : current.terms,
        refundPolicy: body.legal.refundPolicy
          ? { ...current.refundPolicy, ...body.legal.refundPolicy }
          : current.refundPolicy,
        privacy: body.legal.privacy
          ? { ...current.privacy, ...body.legal.privacy }
          : current.privacy,
      })
      doc.markModified('legal')
    }

    if (body.showreel) {
      const current = toSiteSettingsData(doc).showreel
      const next = normalizeShowreelSettings({
        pageHero: body.showreel.pageHero
          ? { ...current.pageHero, ...body.showreel.pageHero }
          : current.pageHero,
        reelsBanner: body.showreel.reelsBanner
          ? { ...current.reelsBanner, ...body.showreel.reelsBanner }
          : current.reelsBanner,
        bonusBanner: body.showreel.bonusBanner
          ? { ...current.bonusBanner, ...body.showreel.bonusBanner }
          : current.bonusBanner,
      })

      for (const slot of ['pageHero', 'reelsBanner', 'bonusBanner'] as const) {
        if (next[slot].imageKey && !next[slot].imageUrl) {
          next[slot].imageUrl = `/api/settings/showreel/${slot}`
        }
      }

      doc.showreel = next
      doc.markModified('showreel')
    }

    if (body.studio) {
      const previous = toSiteSettingsData(doc).studio.categories
      const next = normalizeStudioSettings({
        categories: Array.isArray(body.studio.categories)
          ? body.studio.categories
          : previous,
      })

      if (next.categories.length === 0) {
        return NextResponse.json(
          { success: false, error: 'At least one studio category is required.' },
          { status: 400 },
        )
      }

      // Optional renames: [{ from, to }] so clips move with a slug change.
      const renames = Array.isArray(body.studio.renames)
        ? (body.studio.renames as Array<{ from?: string; to?: string }>)
            .map((r) => ({
              from: String(r.from || '').trim(),
              to: String(r.to || '').trim(),
            }))
            .filter((r) => r.from && r.to && r.from !== r.to)
        : []

      for (const rename of renames) {
        if (!next.categories.some((c) => c.id === rename.to)) continue
        await StudioContent.updateMany(
          { category: rename.from },
          { $set: { category: rename.to } },
        )
      }

      doc.set('studio', next)
      doc.markModified('studio')
    }

    if (body.connect) {
      doc.set('connect', normalizeConnectSettings(body.connect))
      doc.markModified('connect')
    }

    await doc.save()
    invalidateSiteSettingsCache()
    const settings = await getSiteSettings({ bypassCache: true })

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Admin settings PUT:', error)
    return NextResponse.json({ success: false, error: 'Failed to save settings.' }, { status: 500 })
  }
}
