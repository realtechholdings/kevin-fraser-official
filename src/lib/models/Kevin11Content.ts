import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'
import {
  KEVIN11_CATEGORIES,
  KEVIN11_OVERLAY_SLOTS,
  type Kevin11Category,
  type Kevin11OverlaySlot,
} from '@/lib/kevin11/categories'

export {
  KEVIN11_CATEGORIES,
  KEVIN11_CATEGORY_LABELS,
  KEVIN11_OVERLAY_SLOTS,
  type Kevin11Category,
  type Kevin11OverlaySlot,
} from '@/lib/kevin11/categories'

const Kevin11ContentSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    category: {
      type: String,
      enum: KEVIN11_CATEGORIES,
      required: true,
      index: true,
    },
    mediaKey: { type: String, required: true, trim: true },
    mediaUrl: { type: String, required: true, trim: true },
    thumbnailKey: { type: String, default: '', trim: true },
    thumbnailUrl: { type: String, default: '', trim: true },
    mimeType: { type: String, required: true, trim: true },
    sizeBytes: { type: Number, default: 0, min: 0 },
    ctaLabel: { type: String, default: '', trim: true },
    ctaUrl: { type: String, default: '', trim: true },
    overlaySlot: {
      type: String,
      enum: KEVIN11_OVERLAY_SLOTS,
      default: 'none',
    },
    sortOrder: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: true },
  },
  { timestamps: true },
)

Kevin11ContentSchema.index({ published: 1, category: 1, sortOrder: 1, createdAt: -1 })

export type Kevin11ContentDocument = InferSchemaType<typeof Kevin11ContentSchema> & {
  _id: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
  category: Kevin11Category
  overlaySlot: Kevin11OverlaySlot
}

const Kevin11Content: Model<Kevin11ContentDocument> =
  (mongoose.models.Kevin11Content as Model<Kevin11ContentDocument>) ||
  mongoose.model<Kevin11ContentDocument>('Kevin11Content', Kevin11ContentSchema)

export default Kevin11Content
