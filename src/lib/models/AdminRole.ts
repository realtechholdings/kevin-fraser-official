import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

const AdminRoleSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    permissions: { type: [String], default: [] },
    /** Built-in role. Privileges stay full and the role cannot be deleted. */
    system: { type: Boolean, default: false },
  },
  { timestamps: true },
)

export type AdminRoleDocument = InferSchemaType<typeof AdminRoleSchema> & {
  _id: mongoose.Types.ObjectId
}

const AdminRole: Model<AdminRoleDocument> =
  (mongoose.models.AdminRole as Model<AdminRoleDocument>) ||
  mongoose.model<AdminRoleDocument>('AdminRole', AdminRoleSchema)

export default AdminRole
