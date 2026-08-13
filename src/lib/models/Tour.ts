import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

export const TOUR_BANNER_POSITIONS = ['background', 'above'] as const
export type TourBannerPosition = (typeof TOUR_BANNER_POSITIONS)[number]

const TourSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    subtitle: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    /** Card / thumbnail image URL or proxy path */
    coverImage: { type: String, default: '' },
    coverImageKey: { type: String, default: '' },
    /** Wide banner / hero image URL or proxy path */
    bannerImage: { type: String, default: '' },
    bannerImageKey: { type: String, default: '' },
    /** How the banner sits relative to the tour card */
    bannerPosition: {
      type: String,
      enum: TOUR_BANNER_POSITIONS,
      default: 'background',
    },
    /** CSS object-position for banner crop focus (e.g. "center top") */
    bannerFocus: { type: String, default: 'center center' },
    /** Ticket PDF accent colour (hex), e.g. #FF6600 */
    ticketAccent: { type: String, default: '#FF6600', trim: true },
    /** Optional side artwork shown on ticket PDFs for this tour */
    ticketArtwork: { type: String, default: '' },
    ticketArtworkKey: { type: String, default: '' },
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: true },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true }
)

export type TourDocument = InferSchemaType<typeof TourSchema> & { _id: mongoose.Types.ObjectId }

const Tour: Model<TourDocument> =
  (mongoose.models.Tour as Model<TourDocument>) || mongoose.model<TourDocument>('Tour', TourSchema)

export default Tour
