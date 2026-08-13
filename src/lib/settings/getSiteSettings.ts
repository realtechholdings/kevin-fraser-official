import dbConnect from '@/lib/db'
import SiteSettings, { toSiteSettingsData } from '@/lib/models/SiteSettings'
import {
  DEFAULT_SITE_SETTINGS,
  DEFAULT_SHOWREEL_SETTINGS,
  SITE_SETTINGS_KEY,
  normalizeShowreelSettings,
  type ShowreelImageSlot,
  type ShowreelSettings,
  type SiteSettingsData,
} from '@/lib/settings/defaults'
import { publicUrlForKey } from '@/lib/r2'

let cache: { at: number; data: SiteSettingsData } | null = null
const CACHE_MS = 15_000

export function invalidateSiteSettingsCache() {
  cache = null
}

function resolveShowreelSlot(
  slot: ShowreelImageSlot,
  proxyPath: string,
): ShowreelImageSlot {
  if (!slot.imageKey) return slot
  const pub = publicUrlForKey(slot.imageKey)
  if (pub) return { ...slot, imageUrl: pub }
  if (!slot.imageUrl || slot.imageUrl.startsWith('r2://')) {
    return { ...slot, imageUrl: proxyPath }
  }
  return slot
}

function resolveShowreelUrls(showreel: ShowreelSettings): ShowreelSettings {
  return {
    pageHero: resolveShowreelSlot(showreel.pageHero, '/api/settings/showreel/pageHero'),
    reelsBanner: resolveShowreelSlot(showreel.reelsBanner, '/api/settings/showreel/reelsBanner'),
    bonusBanner: resolveShowreelSlot(showreel.bonusBanner, '/api/settings/showreel/bonusBanner'),
  }
}

export async function getSiteSettings(options?: { bypassCache?: boolean }): Promise<SiteSettingsData> {
  if (!options?.bypassCache && cache && Date.now() - cache.at < CACHE_MS) {
    return cache.data
  }

  try {
    await dbConnect()
    let doc = await SiteSettings.findOne({ key: SITE_SETTINGS_KEY })
    if (!doc) {
      doc = await SiteSettings.create({
        key: SITE_SETTINGS_KEY,
        theme: DEFAULT_SITE_SETTINGS.theme,
        ai: DEFAULT_SITE_SETTINGS.ai,
        legal: DEFAULT_SITE_SETTINGS.legal,
        showreel: DEFAULT_SITE_SETTINGS.showreel,
        studio: DEFAULT_SITE_SETTINGS.studio,
      })
    }
    const data = toSiteSettingsData(doc)
    // Prefer public R2 URL when configured; otherwise keep stored proxy/path.
    if (data.ai.avatarKey) {
      const pub = publicUrlForKey(data.ai.avatarKey)
      if (pub) data.ai.avatarUrl = pub
      else if (!data.ai.avatarUrl || data.ai.avatarUrl.startsWith('r2://')) {
        data.ai.avatarUrl = '/api/settings/avatar'
      }
    }
    data.showreel = resolveShowreelUrls(data.showreel)
    cache = { at: Date.now(), data }
    return data
  } catch (error) {
    console.error('getSiteSettings:', error)
    return {
      theme: { ...DEFAULT_SITE_SETTINGS.theme },
      ai: { ...DEFAULT_SITE_SETTINGS.ai },
      legal: { ...DEFAULT_SITE_SETTINGS.legal },
      showreel: normalizeShowreelSettings(DEFAULT_SHOWREEL_SETTINGS),
      studio: { ...DEFAULT_SITE_SETTINGS.studio, categories: [...DEFAULT_SITE_SETTINGS.studio.categories] },
    }
  }
}
