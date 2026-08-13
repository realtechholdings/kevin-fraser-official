import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

const OrderSchema = new Schema(
  {
    show: { type: Schema.Types.ObjectId, ref: 'Show', required: true, index: true },
    tier: { type: Schema.Types.ObjectId, ref: 'TicketTier', default: null, index: true },
    tierName: { type: String, default: '' },
    unitAmountCents: { type: Number, default: 0, min: 0 },
    stripeSessionId: { type: String, required: true, unique: true },
    stripePaymentIntentId: { type: String, default: '' },
    email: { type: String, required: true, lowercase: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    amountTotal: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'cancelled'],
      default: 'pending',
    },
    /** Set once the ticket confirmation email (with PDF) has been sent */
    confirmationEmailSentAt: { type: Date, default: null },
    /** Set once accounts@ has been notified of this paid order */
    salesNotifyEmailSentAt: { type: Date, default: null },
    /** Door check-ins: one entry per scanned ticket number (1-based) */
    checkedIn: {
      type: [
        new Schema(
          {
            ticket: { type: Number, required: true },
            at: { type: Date, default: Date.now },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
)

export type OrderDocument = InferSchemaType<typeof OrderSchema> & { _id: mongoose.Types.ObjectId }

const Order: Model<OrderDocument> =
  (mongoose.models.Order as Model<OrderDocument>) ||
  mongoose.model<OrderDocument>('Order', OrderSchema)

export default Order
