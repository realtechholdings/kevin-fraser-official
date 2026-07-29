import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

const EmailTemplateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    body: { type: String, required: true },
  },
  { timestamps: true },
)

export type EmailTemplateDocument = InferSchemaType<typeof EmailTemplateSchema> & {
  _id: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const EmailTemplate: Model<EmailTemplateDocument> =
  (mongoose.models.EmailTemplate as Model<EmailTemplateDocument>) ||
  mongoose.model<EmailTemplateDocument>('EmailTemplate', EmailTemplateSchema)

export default EmailTemplate
