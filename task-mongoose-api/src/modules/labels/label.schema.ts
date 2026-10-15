import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type { BaseEntity } from '@/shared/base.entity'

export interface LabelEntity extends BaseEntity {
  workspaceId: Types.ObjectId
  name: string
  color: string
}

export interface LabelDocument extends Omit<LabelEntity, '_id'>, Document {}

const labelSchema = new Schema<LabelDocument>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true },
    color: { type: String, required: true },
  },
  { timestamps: true },
)

labelSchema.index({ workspaceId: 1, name: 1 }, { unique: true })

export const LabelModel =
  (mongoose.models.Label as mongoose.Model<LabelDocument>) ||
  mongoose.model<LabelDocument>('Label', labelSchema)
