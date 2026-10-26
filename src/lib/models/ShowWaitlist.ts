import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

const ShowWaitlistSchema = new Schema(
  {
    show: { type: Schema.Types.ObjectId, ref: 'Show', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    notifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

ShowWaitlistSchema.index({ show: 1, email: 1 }, { unique: true })

export type ShowWaitlistDocument = InferSchemaType<typeof ShowWaitlistSchema> & {
  _id: mongoose.Types.ObjectId
}

const ShowWaitlist: Model<ShowWaitlistDocument> =
  (mongoose.models.ShowWaitlist as Model<ShowWaitlistDocument>) ||
  mongoose.model<ShowWaitlistDocument>('ShowWaitlist', ShowWaitlistSchema)

export default ShowWaitlist
