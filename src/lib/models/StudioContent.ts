import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'
import { STUDIO_CATEGORIES, type StudioCategory } from '@/lib/studio/categories'

export { STUDIO_CATEGORIES, STUDIO_CATEGORY_LABELS, type StudioCategory } from '@/lib/studio/categories'

const StudioContentSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    category: {
      type: String,
      enum: STUDIO_CATEGORIES,
      required: true,
      index: true,
    },
    mediaKey: { type: String, required: true, trim: true },
    mediaUrl: { type: String, required: true, trim: true },
    thumbnailKey: { type: String, default: '', trim: true },
    thumbnailUrl: { type: String, default: '', trim: true },
    mimeType: { type: String, required: true, trim: true },
    sizeBytes: { type: Number, default: 0, min: 0 },
    sortOrder: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: true },
  },
  { timestamps: true },
)

StudioContentSchema.index({ published: 1, category: 1, sortOrder: 1, createdAt: -1 })

export type StudioContentDocument = InferSchemaType<typeof StudioContentSchema> & {
  _id: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
  category: StudioCategory
}

const StudioContent: Model<StudioContentDocument> =
  (mongoose.models.StudioContent as Model<StudioContentDocument>) ||
  mongoose.model<StudioContentDocument>('StudioContent', StudioContentSchema)

export default StudioContent
