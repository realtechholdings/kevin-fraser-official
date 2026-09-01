import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

const TicketTableSchema = new Schema(
  {
    show: { type: Schema.Types.ObjectId, ref: 'Show', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: '', trim: true },
    /** Ticket class each seat belongs to (tour/show tier slug, e.g. polaroids). */
    tierSlug: { type: String, required: true, trim: true, lowercase: true },
    /** Seats (tickets) included in one table. */
    seats: { type: Number, required: true, min: 1, default: 5 },
    /** How many tables are for sale. 0 = unlimited. */
    capacity: { type: Number, default: 0, min: 0 },
    tablesSold: { type: Number, default: 0, min: 0 },
    /** Used when customNames does not cover a slot: "Table 1", "Table 2", … */
    namePrefix: { type: String, default: 'Table', trim: true },
    /** Optional explicit names, index 0 = first table sold. */
    customNames: { type: [String], default: [] },
    /**
     * When true, table price is seats × the underlying class price.
     * When false, priceCents is the whole-table price.
     */
    inheritPrice: { type: Boolean, default: true },
    priceCents: { type: Number, default: 0, min: 0 },
    currency: { type: String, required: true, uppercase: true, default: 'AUD' },
    soldOut: { type: Boolean, default: false },
    published: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
)

TicketTableSchema.index({ show: 1, slug: 1 }, { unique: true })
TicketTableSchema.index({ show: 1, sortOrder: 1 })

export type TicketTableDocument = InferSchemaType<typeof TicketTableSchema> & {
  _id: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const TicketTable: Model<TicketTableDocument> =
  (mongoose.models.TicketTable as Model<TicketTableDocument>) ||
  mongoose.model<TicketTableDocument>('TicketTable', TicketTableSchema)

export default TicketTable
