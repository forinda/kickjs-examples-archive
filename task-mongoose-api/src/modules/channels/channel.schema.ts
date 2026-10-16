import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type { BaseEntity } from '@/shared/base.entity'

export type ChannelType = 'public' | 'private' | 'direct'

export interface ChannelEntity extends BaseEntity {
  workspaceId: Types.ObjectId
  projectId?: Types.ObjectId
  name: string
  description?: string
  type: ChannelType
  memberIds: Types.ObjectId[]
  createdById: Types.ObjectId
}

export interface ChannelDocument extends Omit<ChannelEntity, '_id'>, Document {}

const channelSchema = new Schema<ChannelDocument>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: { type: String, enum: ['public', 'private', 'direct'], default: 'public' },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

channelSchema.index({ workspaceId: 1, name: 1 }, { unique: true })

export const ChannelModel =
  (mongoose.models.Channel as mongoose.Model<ChannelDocument>) ||
  mongoose.model<ChannelDocument>('Channel', channelSchema)
