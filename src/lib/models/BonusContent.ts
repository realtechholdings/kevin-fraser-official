import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

const BonusContentSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
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

BonusContentSchema.index({ published: 1, sortOrder: 1, createdAt: -1 })

export type BonusContentDocument = InferSchemaType<typeof BonusContentSchema> & {
  _id: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const BonusContent: Model<BonusContentDocument> =
  (mongoose.models.BonusContent as Model<BonusContentDocument>) ||
  mongoose.model<BonusContentDocument>('BonusContent', BonusContentSchema)

export default BonusContent
