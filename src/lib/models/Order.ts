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
    /** Display name for the ticket holder (manual / comp issues). */
    holderName: { type: String, default: '', trim: true },
    quantity: { type: Number, required: true, min: 1 },
    amountTotal: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'cancelled'],
      default: 'pending',
    },
    /** How the order was created — stripe checkout vs admin manual issue. */
    source: {
      type: String,
      enum: ['stripe', 'manual'],
      default: 'stripe',
      index: true,
    },
    issuedBy: { type: String, default: '' },
    note: { type: String, default: '' },
    /** Set once the ticket confirmation email (with PDF) has been sent */
    confirmationEmailSentAt: { type: Date, default: null },
    /** Set once accounts@ has been notified of this paid order */
    salesNotifyEmailSentAt: { type: Date, default: null },
    /** Table package this order bought (null for regular class sales). */
    table: { type: Schema.Types.ObjectId, ref: 'TicketTable', default: null, index: true },
    /** How many tables in this order. */
    tableQuantity: { type: Number, default: 0, min: 0 },
    /** Seats per table at purchase time. */
    tableSeats: { type: Number, default: 0, min: 0 },
    /** Assigned names, one per table, e.g. ["Table 3", "Table 4"]. */
    tableNames: { type: [String], default: [] },
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
