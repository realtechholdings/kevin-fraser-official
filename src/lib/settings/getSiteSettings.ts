import dbConnect from '@/lib/db'
import SiteSettings, { toSiteSettingsData } from '@/lib/models/SiteSettings'
import {
  DEFAULT_SITE_SETTINGS,
  SITE_SETTINGS_KEY,
  type SiteSettingsData,
} from '@/lib/settings/defaults'
import { publicUrlForKey } from '@/lib/r2'

let cache: { at: number; data: SiteSettingsData } | null = null
const CACHE_MS = 15_000

export function invalidateSiteSettingsCache() {
  cache = null
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
    cache = { at: Date.now(), data }
    return data
  } catch (error) {
    console.error('getSiteSettings:', error)
    return {
      theme: { ...DEFAULT_SITE_SETTINGS.theme },
      ai: { ...DEFAULT_SITE_SETTINGS.ai },
    }
  }
}
