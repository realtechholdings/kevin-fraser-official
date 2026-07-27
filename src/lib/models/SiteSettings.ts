import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'
import {
  DEFAULT_AI_SETTINGS,
  DEFAULT_THEME_SETTINGS,
  SITE_SETTINGS_KEY,
  type AISettings,
  type SiteSettingsData,
  type ThemeSettings,
} from '@/lib/settings/defaults'

const ThemeSchema = new Schema(
  {
    lightAccent: { type: String, default: DEFAULT_THEME_SETTINGS.lightAccent },
    lightAccentContrast: { type: String, default: DEFAULT_THEME_SETTINGS.lightAccentContrast },
    darkAccent: { type: String, default: DEFAULT_THEME_SETTINGS.darkAccent },
    darkAccentContrast: { type: String, default: DEFAULT_THEME_SETTINGS.darkAccentContrast },
  },
  { _id: false },
)

const AISchema = new Schema(
  {
    displayName: { type: String, default: DEFAULT_AI_SETTINGS.displayName },
    greeting: { type: String, default: DEFAULT_AI_SETTINGS.greeting },
    systemPrompt: { type: String, default: DEFAULT_AI_SETTINGS.systemPrompt },
    vocabularyNotes: { type: String, default: DEFAULT_AI_SETTINGS.vocabularyNotes },
    avatarKey: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
  },
  { _id: false },
)

const SiteSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: SITE_SETTINGS_KEY },
    theme: { type: ThemeSchema, default: () => ({ ...DEFAULT_THEME_SETTINGS }) },
    ai: { type: AISchema, default: () => ({ ...DEFAULT_AI_SETTINGS }) },
  },
  { timestamps: true },
)

export type SiteSettingsDocument = InferSchemaType<typeof SiteSettingsSchema> & {
  _id: mongoose.Types.ObjectId
  theme: ThemeSettings
  ai: AISettings
  createdAt: Date
  updatedAt: Date
}

const SiteSettings: Model<SiteSettingsDocument> =
  (mongoose.models.SiteSettings as Model<SiteSettingsDocument>) ||
  mongoose.model<SiteSettingsDocument>('SiteSettings', SiteSettingsSchema)

export default SiteSettings

export function toSiteSettingsData(doc: SiteSettingsDocument | null): SiteSettingsData {
  if (!doc) {
    return {
      theme: { ...DEFAULT_THEME_SETTINGS },
      ai: { ...DEFAULT_AI_SETTINGS },
    }
  }
  return {
    theme: {
      lightAccent: doc.theme?.lightAccent || DEFAULT_THEME_SETTINGS.lightAccent,
      lightAccentContrast: doc.theme?.lightAccentContrast || DEFAULT_THEME_SETTINGS.lightAccentContrast,
      darkAccent: doc.theme?.darkAccent || DEFAULT_THEME_SETTINGS.darkAccent,
      darkAccentContrast: doc.theme?.darkAccentContrast || DEFAULT_THEME_SETTINGS.darkAccentContrast,
    },
    ai: {
      displayName: doc.ai?.displayName || DEFAULT_AI_SETTINGS.displayName,
      greeting: doc.ai?.greeting || DEFAULT_AI_SETTINGS.greeting,
      systemPrompt: doc.ai?.systemPrompt || DEFAULT_AI_SETTINGS.systemPrompt,
      vocabularyNotes: doc.ai?.vocabularyNotes || '',
      avatarKey: doc.ai?.avatarKey || '',
      avatarUrl: doc.ai?.avatarUrl || '',
    },
  }
}
