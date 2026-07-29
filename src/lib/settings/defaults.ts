import { KEVIN_PERSONA } from '@/lib/llm/persona'
import {
  DEFAULT_LEGAL_SETTINGS,
  type LegalSettings,
} from '@/lib/settings/legalDefaults'

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

export type { LegalDocumentSettings, LegalSettings } from '@/lib/settings/legalDefaults'

export type SiteSettingsData = {
  theme: ThemeSettings
  ai: AISettings
  legal: LegalSettings
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

export { DEFAULT_LEGAL_SETTINGS }

export const DEFAULT_SITE_SETTINGS: SiteSettingsData = {
  theme: DEFAULT_THEME_SETTINGS,
  ai: DEFAULT_AI_SETTINGS,
  legal: DEFAULT_LEGAL_SETTINGS,
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
