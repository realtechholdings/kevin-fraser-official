import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

export const DEFAULT_TICKET_SUBJECT = 'Your tickets — {{show}} in {{city}}'

export const DEFAULT_TICKET_BODY = `Hi {{name}},

Thanks for your purchase! Your {{quantity}} x {{tier}} ticket(s) for {{show}} at {{venue}}, {{city}} on {{date}} are attached — one PDF per ticket so you can forward them individually.

Show starts at {{time}}. Order reference: {{orderId}}.

Bring each attached PDF (printed or on your phone) to the door — see you there!

If you’d like to upgrade your tickets, you can do that here: {{upgradeUrl}}`

export const DEFAULT_UPGRADE_SUBJECT = 'Your upgraded tickets — {{show}} in {{city}}'

export const DEFAULT_UPGRADE_BODY = `Hi {{name}},

Your tickets have been upgraded from {{oldTier}} to {{newTier}} for {{show}} at {{venue}}, {{city}} on {{date}}.

Your previous tickets are no longer valid and will not scan at the door. The new PDFs are attached — bring those instead.

Show starts at {{time}}. New order reference: {{orderId}}.`

export const DEFAULT_UPGRADE_OFFER_SUBJECT = 'Upgrade your tickets — {{show}} in {{city}}'

export const DEFAULT_UPGRADE_OFFER_BODY = `Hi {{name}},

You’re in for {{show}} — {{quantity}} × {{oldTier}} at {{venue}}, {{city}} on {{date}}.

Want a better seat in the room? You can upgrade:

{{offers}}

Your current tickets would be replaced. Old PDFs will no longer scan.

Upgrade here: {{upgradeUrl}}`

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
    upgradeEmailEnabled: { type: Boolean, default: true },
    upgradeEmailSubject: { type: String, default: DEFAULT_UPGRADE_SUBJECT },
    upgradeEmailBody: { type: String, default: DEFAULT_UPGRADE_BODY },
    upgradeOfferEmailEnabled: { type: Boolean, default: false },
    upgradeOfferEmailSubject: { type: String, default: DEFAULT_UPGRADE_OFFER_SUBJECT },
    upgradeOfferEmailBody: { type: String, default: DEFAULT_UPGRADE_OFFER_BODY },
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
