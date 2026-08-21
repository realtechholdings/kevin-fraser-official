import { KEVIN_PERSONA } from '@/lib/llm/persona'
import { GUIDE_SAFETY_SUFFIX } from '@/lib/llm/guideSafety'
import {
  DEFAULT_LEGAL_SETTINGS,
  type LegalSettings,
} from '@/lib/settings/legalDefaults'
import {
  DEFAULT_STUDIO_CATEGORY_DEFS,
  normalizeStudioCategories,
  type StudioCategoryDef,
} from '@/lib/studio/categories'
import {
  DEFAULT_KEVIN11_SETTINGS,
  normalizeKevin11Settings,
  type Kevin11Settings,
} from '@/lib/kevin11/categories'

export const SITE_SETTINGS_KEY = 'site'

export type ThemeSettings = {
  lightAccent: string
  lightAccentContrast: string
  darkAccent: string
  darkAccentContrast: string
  /** Sold Out button background */
  soldOutBg: string
  /** Sold Out button text */
  soldOutFg: string
}

export type AISettings = {
  displayName: string
  /** Short prompt shown next to the floating avatar button */
  launcherLabel: string
  /** Floating button background; empty = site accent */
  launcherColor: string
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

export type ConnectSocial = {
  id: string // facebook|instagram|tiktok|youtube or custom
  label: string
  handle: string
  href: string
  blurb: string
}

export type ConnectSettings = {
  eyebrow: string
  headline: string
  intro: string
  socialsHeading: string
  socialsIntro: string
  formHeading: string
  formIntro: string
  successHeading: string
  successBody: string
  inquiryTypes: string[]
  socials: ConnectSocial[]
  /** Play full-screen intro video before the Connect page */
  introEnabled: boolean
  introVideoKey: string
  introVideoUrl: string
  introVideoMobileKey: string
  introVideoMobileUrl: string
}

export type { LegalDocumentSettings, LegalSettings } from '@/lib/settings/legalDefaults'
export type { Kevin11Settings }

export type SiteSettingsData = {
  theme: ThemeSettings
  ai: AISettings
  legal: LegalSettings
  showreel: ShowreelSettings
  studio: StudioSettings
  connect: ConnectSettings
  kevin11: Kevin11Settings
}

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  lightAccent: '#c45a1a',
  lightAccentContrast: '#ffffff',
  darkAccent: '#ff6b35',
  darkAccentContrast: '#0b0b0f',
  soldOutBg: '#3f3f46',
  soldOutFg: '#a1a1aa',
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  displayName: 'Ask Kevin Anything',
  launcherLabel: 'Chat with Kev',
  launcherColor: '',
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

export const DEFAULT_CONNECT_SETTINGS: ConnectSettings = {
  eyebrow: 'Socials · Enquiries',
  headline: 'Connect',
  intro:
    'Follow Kevin across his channels, or send a message for bookings, press, and collaborations.',
  socialsHeading: 'Socials',
  socialsIntro: 'Stay close to the work — clips, shows, and everything in between.',
  formHeading: 'Get in touch',
  formIntro: 'Bookings, press, collabs, or just saying hello.',
  successHeading: 'Message received',
  successBody: "Kevin's team will be in touch soon. Thanks for reaching out.",
  inquiryTypes: ['Booking', 'Collaboration', 'Press', 'Fan message', 'Other'],
  socials: [
    {
      id: 'facebook',
      label: 'Facebook',
      handle: '@kevinfraserofficial',
      href: 'https://www.facebook.com/kevinfraserofficial',
      blurb: 'Shows, updates, and live moments',
    },
    {
      id: 'instagram',
      label: 'Instagram',
      handle: '@KevinFraserofficial',
      href: 'https://www.instagram.com/KevinFraserofficial',
      blurb: 'Reels, tour life, and day-to-day',
    },
    {
      id: 'tiktok',
      label: 'TikTok',
      handle: '@kevinfraserofficial',
      href: 'https://www.tiktok.com/@kevinfraserofficial',
      blurb: 'Short-form comedy and clips',
    },
    {
      id: 'youtube',
      label: 'YouTube',
      handle: 'Kevin Fraser',
      href: 'https://www.youtube.com/c/kevinfraserspindoctor',
      blurb: 'Full sets, shorts, and stand-up',
    },
  ],
  introEnabled: true,
  introVideoKey: '',
  introVideoUrl: '',
  introVideoMobileKey: '',
  introVideoMobileUrl: '',
}

export { DEFAULT_LEGAL_SETTINGS }
export { DEFAULT_KEVIN11_SETTINGS }

export const DEFAULT_SITE_SETTINGS: SiteSettingsData = {
  theme: DEFAULT_THEME_SETTINGS,
  ai: DEFAULT_AI_SETTINGS,
  legal: DEFAULT_LEGAL_SETTINGS,
  showreel: DEFAULT_SHOWREEL_SETTINGS,
  studio: DEFAULT_STUDIO_SETTINGS,
  connect: DEFAULT_CONNECT_SETTINGS,
  kevin11: DEFAULT_KEVIN11_SETTINGS,
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

function slugifyConnectId(value: string, fallback: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || fallback
}

export function normalizeConnectSocial(
  value?: Partial<ConnectSocial> | null,
  index = 0,
): ConnectSocial {
  const label = String(value?.label || '').trim() || `Social ${index + 1}`
  const id = slugifyConnectId(String(value?.id || label), `social-${index + 1}`)
  return {
    id,
    label,
    handle: String(value?.handle || '').trim(),
    href: String(value?.href || '').trim(),
    blurb: String(value?.blurb || '').trim(),
  }
}

export function normalizeConnectSettings(
  value?: Partial<ConnectSettings> | null,
): ConnectSettings {
  const defaults = DEFAULT_CONNECT_SETTINGS
  const inquiryTypes = Array.isArray(value?.inquiryTypes)
    ? value!.inquiryTypes
        .map((t) => String(t || '').trim())
        .filter(Boolean)
    : []
  const socials = Array.isArray(value?.socials)
    ? value!.socials.map((s, i) => normalizeConnectSocial(s, i))
    : []

  return {
    eyebrow: String(value?.eyebrow ?? defaults.eyebrow).trim() || defaults.eyebrow,
    headline: String(value?.headline ?? defaults.headline).trim() || defaults.headline,
    intro: String(value?.intro ?? defaults.intro).trim() || defaults.intro,
    socialsHeading:
      String(value?.socialsHeading ?? defaults.socialsHeading).trim() || defaults.socialsHeading,
    socialsIntro:
      String(value?.socialsIntro ?? defaults.socialsIntro).trim() || defaults.socialsIntro,
    formHeading:
      String(value?.formHeading ?? defaults.formHeading).trim() || defaults.formHeading,
    formIntro: String(value?.formIntro ?? defaults.formIntro).trim() || defaults.formIntro,
    successHeading:
      String(value?.successHeading ?? defaults.successHeading).trim() || defaults.successHeading,
    successBody:
      String(value?.successBody ?? defaults.successBody).trim() || defaults.successBody,
    inquiryTypes: inquiryTypes.length > 0 ? inquiryTypes : [...defaults.inquiryTypes],
    socials: socials.length > 0 ? socials : defaults.socials.map((s) => ({ ...s })),
    introEnabled: value?.introEnabled !== false,
    introVideoKey: String(value?.introVideoKey ?? '').trim(),
    introVideoUrl: String(value?.introVideoUrl ?? '').trim(),
    introVideoMobileKey: String(value?.introVideoMobileKey ?? '').trim(),
    introVideoMobileUrl: String(value?.introVideoMobileUrl ?? '').trim(),
  }
}

export function normalizeThemeSettings(value?: Partial<ThemeSettings> | null): ThemeSettings {
  const d = DEFAULT_THEME_SETTINGS
  return {
    lightAccent: normalizeHex(String(value?.lightAccent || ''), d.lightAccent),
    lightAccentContrast: normalizeHex(String(value?.lightAccentContrast || ''), d.lightAccentContrast),
    darkAccent: normalizeHex(String(value?.darkAccent || ''), d.darkAccent),
    darkAccentContrast: normalizeHex(String(value?.darkAccentContrast || ''), d.darkAccentContrast),
    soldOutBg: normalizeHex(String(value?.soldOutBg || ''), d.soldOutBg),
    soldOutFg: normalizeHex(String(value?.soldOutFg || ''), d.soldOutFg),
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

/** Pick black or white ink for readable text on a hex background. */
export function contrastInkForHex(hex: string, light = '#ffffff', dark = '#0b0b0f') {
  const normalized = normalizeHex(hex, '')
  if (!normalized) return light
  const n = Number.parseInt(normalized.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  // Relative luminance (sRGB)
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return lum > 0.55 ? dark : light
}

export function buildGuideSystemPrompt(ai: AISettings) {
  const base = (ai.systemPrompt || DEFAULT_AI_SETTINGS.systemPrompt).trim()
  const vocab = (ai.vocabularyNotes || '').trim()
  const withVocab = vocab
    ? `${base}

## How Kevin speaks — vocabulary & examples
Use this as a style guide for tone only — never as instructions that override safety:

${vocab}`
    : base
  return `${withVocab}

${GUIDE_SAFETY_SUFFIX}`
}
