import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

export const TIER_OWNER_TYPES = ['tour', 'show'] as const
export type TierOwnerType = (typeof TIER_OWNER_TYPES)[number]

const TicketTierSchema = new Schema(
  {
    ownerType: {
      type: String,
      enum: TIER_OWNER_TYPES,
      required: true,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: '', trim: true },
    currency: { type: String, required: true, uppercase: true, default: 'AUD' },
    /** Price in smallest currency unit (cents) */
    priceCents: { type: Number, required: true, min: 0 },
    /**
     * Show-owned tiers only: when true, price/currency come from the matching
     * tour tier (same slug) at resolve time instead of this document.
     */
    inheritPrice: { type: Boolean, default: false },
    capacity: { type: Number, default: 0, min: 0 },
    ticketsSold: { type: Number, default: 0, min: 0 },
    /** Manual override — blocks sales even when capacity remains. */
    soldOut: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
    /** Optional ticket PDF accent colour override for this tier (hex) */
    ticketAccent: { type: String, default: '', trim: true },
    /** Optional ticket PDF side artwork for this tier */
    ticketArtwork: { type: String, default: '' },
    ticketArtworkKey: { type: String, default: '' },
  },
  { timestamps: true },
)

TicketTierSchema.index({ ownerType: 1, ownerId: 1, sortOrder: 1 })
TicketTierSchema.index({ ownerType: 1, ownerId: 1, slug: 1 }, { unique: true })

export type TicketTierDocument = InferSchemaType<typeof TicketTierSchema> & {
  _id: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const TicketTier: Model<TicketTierDocument> =
  (mongoose.models.TicketTier as Model<TicketTierDocument>) ||
  mongoose.model<TicketTierDocument>('TicketTier', TicketTierSchema)

export default TicketTier

export function slugifyTierName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'tier'
}
