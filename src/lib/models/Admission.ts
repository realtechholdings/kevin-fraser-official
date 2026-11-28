import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

/**
 * Door ledger: one entry each time an usher admits guests, and one each time
 * a supervisor reverses an admission. Entries are never edited or deleted, so
 * the order and its payment records stay untouched by what happens at the door.
 */
const AdmissionSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    show: { type: Schema.Types.ObjectId, ref: 'Show', required: true, index: true },
    kind: { type: String, enum: ['admit', 'reversal'], required: true },
    /** Ticket numbers (1-based, matching the PDFs) this entry let in or released. */
    tickets: { type: [Number], default: [] },
    quantity: { type: Number, required: true, min: 1 },
    /** Ticket class at the time, so history still reads right after a tier is renamed. */
    tierName: { type: String, default: '' },
    /** Staff member who was signed in to the scanner. */
    usherId: { type: String, required: true },
    usherName: { type: String, default: '' },
    usherEmail: { type: String, default: '' },
    /** How the booking was retrieved: camera scan or name / reference search. */
    method: { type: String, enum: ['scan', 'search'], default: 'scan' },
    /** For a reversal: the admission it cancels (null when that check-in predates this ledger). */
    reverses: { type: Schema.Types.ObjectId, ref: 'Admission', default: null },
    reason: { type: String, default: '', trim: true },
  },
  { timestamps: true },
)

AdmissionSchema.index({ order: 1, createdAt: 1 })
// One admission can only be reversed once, even if two supervisors press at the same moment.
AdmissionSchema.index(
  { reverses: 1 },
  { unique: true, partialFilterExpression: { reverses: { $type: 'objectId' } } },
)

export type AdmissionDocument = InferSchemaType<typeof AdmissionSchema> & {
  _id: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const Admission: Model<AdmissionDocument> =
  (mongoose.models.Admission as Model<AdmissionDocument>) ||
  mongoose.model<AdmissionDocument>('Admission', AdmissionSchema)

export default Admission
