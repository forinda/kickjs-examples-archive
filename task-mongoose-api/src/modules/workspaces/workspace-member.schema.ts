import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type { BaseEntity } from '@/shared/base.entity'

export interface WorkspaceMemberEntity extends BaseEntity {
  workspaceId: Types.ObjectId
  userId: Types.ObjectId
  role: 'admin' | 'member'
  /** `pending` until the invitee accepts; only accepted rows grant anything. */
  status: 'pending' | 'accepted'
  joinedAt: Date
}

export interface WorkspaceMemberDocument extends Omit<WorkspaceMemberEntity, '_id'>, Document {}

const workspaceMemberSchema = new Schema<WorkspaceMemberDocument>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    status: { type: String, enum: ['pending', 'accepted'], default: 'accepted' },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true })

/**
 * Matches accepted memberships. `$ne: 'pending'` (not `'accepted'`) so rows
 * written before the status field existed still count, with no migration.
 */
export const ACCEPTED = { status: { $ne: 'pending' } } as const

export const WorkspaceMemberModel =
  (mongoose.models.WorkspaceMember as mongoose.Model<WorkspaceMemberDocument>) ||
  mongoose.model<WorkspaceMemberDocument>('WorkspaceMember', workspaceMemberSchema)
