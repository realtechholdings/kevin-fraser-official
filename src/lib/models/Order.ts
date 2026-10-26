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
      enum: ['pending', 'paid', 'refunded', 'cancelled', 'upgraded', 'transferred'],
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
    /**
     * False when a manual issue was created with "count against inventory"
     * unchecked, so voiding it must not put seats back a second time.
     */
    inventoryCounted: { type: Boolean, default: true },
    /** Set once the ticket confirmation email (with PDF) has been sent */
    confirmationEmailSentAt: { type: Date, default: null },
    /** Resend email id for the last ticket send, used to look up delivery. */
    confirmationEmailId: { type: String, default: '' },
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
    /** Original order this paid upgrade replaced (null for a first purchase). */
    upgradedFrom: { type: Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
    /** Original order these tickets were moved from (null unless this is a transfer). */
    transferFrom: { type: Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
    /**
     * Cents of the original charge that moved with a transfer. Refunding the
     * replacement returns this share of the original payment as well.
     */
    transferCreditCents: { type: Number, default: 0, min: 0 },
    /** New order that replaced this one after an upgrade (old QR is then void). */
    supersededBy: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    /** Set once the post-purchase upgrade-offer email has been sent */
    upgradeOfferEmailSentAt: { type: Date, default: null },
    /** Set when an admin refunds this order. */
    refundedAt: { type: Date, default: null },
    refundedBy: { type: String, default: '' },
    stripeRefundId: { type: String, default: '' },
    /** Integration-currency cents already sent back for this order's own charge. */
    refundedCents: { type: Number, default: 0, min: 0 },
    /**
     * Individual ticket numbers (1-based, matching the PDF) that no longer scan.
     * The order quantity stays put so the remaining QR codes keep their numbers.
     */
    voidedTickets: {
      type: [
        new Schema(
          {
            ticket: { type: Number, required: true },
            reason: { type: String, enum: ['refunded', 'upgraded', 'transferred'], required: true },
            at: { type: Date, default: Date.now },
            stripeRefundId: { type: String, default: '' },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
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
