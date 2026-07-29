import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'
// Registers the Tour schema so populate('tour') works in serverless bundles
// that import Show without importing Tour directly.
import '@/lib/models/Tour'

export const SHOW_STATUSES = ['on_sale', 'sold_out', 'cancelled', 'coming_soon'] as const
export type ShowStatus = (typeof SHOW_STATUSES)[number]

const ShowSchema = new Schema(
  {
    tour: { type: Schema.Types.ObjectId, ref: 'Tour', required: true, index: true },
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true, index: true },
    doorsTime: { type: String, default: '' },
    showTime: { type: String, default: '' },
    country: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    address: { type: String, default: '', trim: true },
    currency: { type: String, required: true, uppercase: true, default: 'AUD' },
    /** Price in smallest currency unit (cents) */
    priceCents: { type: Number, required: true, min: 0 },
    capacity: { type: Number, default: 0, min: 0 },
    ticketsSold: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: SHOW_STATUSES,
      default: 'on_sale',
    },
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: true },
    externalTicketUrl: { type: String, default: '' },
    /** Show poster / artwork URL or proxy path */
    artworkImage: { type: String, default: '' },
    artworkImageKey: { type: String, default: '' },
    /** Optional venue photo for the show detail page */
    venueImage: { type: String, default: '' },
    venueImageKey: { type: String, default: '' },
    /** Optional blurb for the show detail page */
    description: { type: String, default: '', trim: true },
  },
  { timestamps: true }
)

ShowSchema.index({ date: 1, published: 1 })

export type ShowDocument = InferSchemaType<typeof ShowSchema> & { _id: mongoose.Types.ObjectId }

const Show: Model<ShowDocument> =
  (mongoose.models.Show as Model<ShowDocument>) || mongoose.model<ShowDocument>('Show', ShowSchema)

export default Show
