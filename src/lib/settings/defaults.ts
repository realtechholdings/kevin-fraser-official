import { KEVIN_PERSONA } from '@/lib/llm/persona'
import {
  DEFAULT_LEGAL_SETTINGS,
  type LegalSettings,
} from '@/lib/settings/legalDefaults'
import {
  DEFAULT_STUDIO_CATEGORY_DEFS,
  normalizeStudioCategories,
  type StudioCategoryDef,
} from '@/lib/studio/categories'

export const SITE_SETTINGS_KEY = 'site'

export type ThemeSettings = {
  lightAccent: string
  lightAccentContrast: string
  darkAccent: string
  darkAccentContrast: string
}

export type AISettings = {
  displayName: string
  greeting: string
  systemPrompt: string
  vocabularyNotes: string
  avatarKey: string
  avatarUrl: string
}

export type ShowreelImageSlot = {
  imageKey: string
  imageUrl: string
  focus: string
}

export type ShowreelSettings = {
  pageHero: ShowreelImageSlot
  reelsBanner: ShowreelImageSlot
  bonusBanner: ShowreelImageSlot
}

export type StudioSettings = {
  categories: StudioCategoryDef[]
}

export type { LegalDocumentSettings, LegalSettings } from '@/lib/settings/legalDefaults'

export type SiteSettingsData = {
  theme: ThemeSettings
  ai: AISettings
  legal: LegalSettings
  showreel: ShowreelSettings
  studio: StudioSettings
}

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  lightAccent: '#c45a1a',
  lightAccentContrast: '#ffffff',
  darkAccent: '#ff6b35',
  darkAccentContrast: '#0b0b0f',
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  displayName: 'Ask Kevin Anything',
  greeting:
    "G'day! I'm Kevin's AI Guide. Ask me anything about Kevin's worlds, upcoming events, or how to get in touch! 👋",
  systemPrompt: KEVIN_PERSONA,
  vocabularyNotes: '',
  avatarKey: '',
  avatarUrl: '',
}

export const EMPTY_SHOWREEL_IMAGE_SLOT: ShowreelImageSlot = {
  imageKey: '',
  imageUrl: '',
  focus: 'center center',
}

export const DEFAULT_SHOWREEL_SETTINGS: ShowreelSettings = {
  pageHero: { ...EMPTY_SHOWREEL_IMAGE_SLOT },
  reelsBanner: { ...EMPTY_SHOWREEL_IMAGE_SLOT },
  bonusBanner: { ...EMPTY_SHOWREEL_IMAGE_SLOT },
}

export const DEFAULT_STUDIO_SETTINGS: StudioSettings = {
  categories: DEFAULT_STUDIO_CATEGORY_DEFS.map((c) => ({ ...c })),
}

export { DEFAULT_LEGAL_SETTINGS }

export const DEFAULT_SITE_SETTINGS: SiteSettingsData = {
  theme: DEFAULT_THEME_SETTINGS,
  ai: DEFAULT_AI_SETTINGS,
  legal: DEFAULT_LEGAL_SETTINGS,
  showreel: DEFAULT_SHOWREEL_SETTINGS,
  studio: DEFAULT_STUDIO_SETTINGS,
}

export function normalizeShowreelImageSlot(
  value?: Partial<ShowreelImageSlot> | null,
): ShowreelImageSlot {
  return {
    imageKey: String(value?.imageKey || '').trim(),
    imageUrl: String(value?.imageUrl || '').trim(),
    focus: String(value?.focus || '').trim() || 'center center',
  }
}

export function normalizeShowreelSettings(
  value?: Partial<ShowreelSettings> | null,
): ShowreelSettings {
  return {
    pageHero: normalizeShowreelImageSlot(value?.pageHero),
    reelsBanner: normalizeShowreelImageSlot(value?.reelsBanner),
    bonusBanner: normalizeShowreelImageSlot(value?.bonusBanner),
  }
}

export function normalizeStudioSettings(
  value?: Partial<StudioSettings> | null,
): StudioSettings {
  return {
    categories: normalizeStudioCategories(value?.categories),
  }
}

export function hexToRgba(hex: string, alpha: number) {
  const raw = hex.replace('#', '').trim()
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return `rgba(196, 90, 26, ${alpha})`
  const n = Number.parseInt(full, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function normalizeHex(value: string, fallback: string) {
  const v = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase()
  if (/^[0-9a-fA-F]{6}$/.test(v)) return `#${v.toLowerCase()}`
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const a = v[1]
    const b = v[2]
    const c = v[3]
    return `#${a}${a}${b}${b}${c}${c}`.toLowerCase()
  }
  return fallback
}

export function buildGuideSystemPrompt(ai: AISettings) {
  const base = (ai.systemPrompt || DEFAULT_AI_SETTINGS.systemPrompt).trim()
  const vocab = (ai.vocabularyNotes || '').trim()
  if (!vocab) return base
  return `${base}

## How Kevin speaks — vocabulary & examples
Use this as a style guide. Mirror the tone, phrasing, and energy when it fits:

${vocab}`
}
