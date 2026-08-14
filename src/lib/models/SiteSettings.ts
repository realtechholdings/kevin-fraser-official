import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'
import {
  DEFAULT_AI_SETTINGS,
  DEFAULT_CONNECT_SETTINGS,
  DEFAULT_SHOWREEL_SETTINGS,
  DEFAULT_STUDIO_SETTINGS,
  DEFAULT_THEME_SETTINGS,
  SITE_SETTINGS_KEY,
  normalizeConnectSettings,
  normalizeShowreelSettings,
  normalizeStudioSettings,
  type AISettings,
  type ConnectSettings,
  type ShowreelSettings,
  type SiteSettingsData,
  type StudioSettings,
  type ThemeSettings,
} from '@/lib/settings/defaults'
import {
  DEFAULT_LEGAL_SETTINGS,
  normalizeLegalSettings,
  type LegalSettings,
} from '@/lib/settings/legalDefaults'

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

const LegalDocumentSchema = new Schema(
  {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    body: { type: String, default: '' },
  },
  { _id: false },
)

const LegalSchema = new Schema(
  {
    terms: { type: LegalDocumentSchema, default: () => ({ ...DEFAULT_LEGAL_SETTINGS.terms }) },
    refundPolicy: {
      type: LegalDocumentSchema,
      default: () => ({ ...DEFAULT_LEGAL_SETTINGS.refundPolicy }),
    },
    privacy: { type: LegalDocumentSchema, default: () => ({ ...DEFAULT_LEGAL_SETTINGS.privacy }) },
  },
  { _id: false },
)

const ShowreelImageSlotSchema = new Schema(
  {
    imageKey: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    focus: { type: String, default: 'center center' },
  },
  { _id: false },
)

const ShowreelSchema = new Schema(
  {
    pageHero: {
      type: ShowreelImageSlotSchema,
      default: () => ({ ...DEFAULT_SHOWREEL_SETTINGS.pageHero }),
    },
    reelsBanner: {
      type: ShowreelImageSlotSchema,
      default: () => ({ ...DEFAULT_SHOWREEL_SETTINGS.reelsBanner }),
    },
    bonusBanner: {
      type: ShowreelImageSlotSchema,
      default: () => ({ ...DEFAULT_SHOWREEL_SETTINGS.bonusBanner }),
    },
  },
  { _id: false },
)

const StudioCategorySchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false },
)

const StudioSchema = new Schema(
  {
    categories: {
      type: [StudioCategorySchema],
      default: () => DEFAULT_STUDIO_SETTINGS.categories.map((c) => ({ ...c })),
    },
  },
  { _id: false },
)

const ConnectSocialSchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    handle: { type: String, default: '' },
    href: { type: String, default: '' },
    blurb: { type: String, default: '' },
  },
  { _id: false },
)

const ConnectSchema = new Schema(
  {
    eyebrow: { type: String, default: DEFAULT_CONNECT_SETTINGS.eyebrow },
    headline: { type: String, default: DEFAULT_CONNECT_SETTINGS.headline },
    intro: { type: String, default: DEFAULT_CONNECT_SETTINGS.intro },
    socialsHeading: { type: String, default: DEFAULT_CONNECT_SETTINGS.socialsHeading },
    socialsIntro: { type: String, default: DEFAULT_CONNECT_SETTINGS.socialsIntro },
    formHeading: { type: String, default: DEFAULT_CONNECT_SETTINGS.formHeading },
    formIntro: { type: String, default: DEFAULT_CONNECT_SETTINGS.formIntro },
    successHeading: { type: String, default: DEFAULT_CONNECT_SETTINGS.successHeading },
    successBody: { type: String, default: DEFAULT_CONNECT_SETTINGS.successBody },
    inquiryTypes: {
      type: [String],
      default: () => [...DEFAULT_CONNECT_SETTINGS.inquiryTypes],
    },
    socials: {
      type: [ConnectSocialSchema],
      default: () => DEFAULT_CONNECT_SETTINGS.socials.map((s) => ({ ...s })),
    },
  },
  { _id: false },
)

const SiteSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: SITE_SETTINGS_KEY },
    theme: { type: ThemeSchema, default: () => ({ ...DEFAULT_THEME_SETTINGS }) },
    ai: { type: AISchema, default: () => ({ ...DEFAULT_AI_SETTINGS }) },
    legal: { type: LegalSchema, default: () => ({ ...DEFAULT_LEGAL_SETTINGS }) },
    showreel: { type: ShowreelSchema, default: () => ({ ...DEFAULT_SHOWREEL_SETTINGS }) },
    studio: { type: StudioSchema, default: () => ({ ...DEFAULT_STUDIO_SETTINGS }) },
    connect: {
      type: ConnectSchema,
      default: () => normalizeConnectSettings(DEFAULT_CONNECT_SETTINGS),
    },
  },
  { timestamps: true },
)

export type SiteSettingsDocument = InferSchemaType<typeof SiteSettingsSchema> & {
  _id: mongoose.Types.ObjectId
  theme: ThemeSettings
  ai: AISettings
  legal: LegalSettings
  showreel: ShowreelSettings
  studio: StudioSettings
  connect: ConnectSettings
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
      legal: normalizeLegalSettings(DEFAULT_LEGAL_SETTINGS),
      showreel: normalizeShowreelSettings(DEFAULT_SHOWREEL_SETTINGS),
      studio: normalizeStudioSettings(DEFAULT_STUDIO_SETTINGS),
      connect: normalizeConnectSettings(DEFAULT_CONNECT_SETTINGS),
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
    legal: normalizeLegalSettings(doc.legal as Partial<LegalSettings> | undefined),
    showreel: normalizeShowreelSettings(doc.showreel as Partial<ShowreelSettings> | undefined),
    studio: normalizeStudioSettings(doc.studio as Partial<StudioSettings> | undefined),
    connect: normalizeConnectSettings(doc.connect as Partial<ConnectSettings> | undefined),
  }
}
