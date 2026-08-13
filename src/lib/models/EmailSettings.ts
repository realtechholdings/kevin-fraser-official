import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

export const DEFAULT_TICKET_SUBJECT = 'Your tickets — {{show}} in {{city}}'

export const DEFAULT_TICKET_BODY = `Hi {{name}},

Thanks for your purchase! Your {{quantity}} x {{tier}} ticket(s) for {{show}} at {{venue}}, {{city}} on {{date}} are attached — one PDF per ticket so you can forward them individually.

Show starts at {{time}}. Order reference: {{orderId}}.

Bring each attached PDF (printed or on your phone) to the door — see you there!`

/** Singleton document (key: 'default') holding CMS email configuration. */
const EmailSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    signatureName: { type: String, default: 'Kevin Fraser' },
    signatureTagline: { type: String, default: 'Comedian · Kevin Fraser Official' },
    signatureLinkUrl: { type: String, default: '' },
    /** Publicly reachable image (headshot/logo) shown above the signature */
    signatureImageUrl: { type: String, default: '' },
    ticketEmailEnabled: { type: Boolean, default: true },
    ticketEmailSubject: { type: String, default: DEFAULT_TICKET_SUBJECT },
    ticketEmailBody: { type: String, default: DEFAULT_TICKET_BODY },
  },
  { timestamps: true },
)

export type EmailSettingsDocument = InferSchemaType<typeof EmailSettingsSchema> & {
  _id: mongoose.Types.ObjectId
}

const EmailSettings: Model<EmailSettingsDocument> =
  (mongoose.models.EmailSettings as Model<EmailSettingsDocument>) ||
  mongoose.model<EmailSettingsDocument>('EmailSettings', EmailSettingsSchema)

export default EmailSettings

export async function getEmailSettings() {
  return (
    (await EmailSettings.findOne({ key: 'default' })) ||
    (await EmailSettings.create({ key: 'default' }))
  )
}
