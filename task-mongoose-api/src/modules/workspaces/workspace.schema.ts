import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type { BaseEntity } from '@/shared/base.entity'

export interface WorkspaceEntity extends BaseEntity {
  name: string
  slug: string
  description?: string
  ownerId: Types.ObjectId
  logoUrl?: string
}

export interface WorkspaceDocument extends Omit<WorkspaceEntity, '_id'>, Document {}

const workspaceSchema = new Schema<WorkspaceDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    logoUrl: { type: String },
  },
  { timestamps: true },
)

export const WorkspaceModel =
  (mongoose.models.Workspace as mongoose.Model<WorkspaceDocument>) ||
  mongoose.model<WorkspaceDocument>('Workspace', workspaceSchema)
