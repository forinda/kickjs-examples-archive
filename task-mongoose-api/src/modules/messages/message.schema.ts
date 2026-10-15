import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type { BaseEntity } from '@/shared/base.entity'

export interface MessageEntity extends BaseEntity {
  channelId: Types.ObjectId
  senderId: Types.ObjectId
  content: string
  mentions: Types.ObjectId[]
  isEdited: boolean
  isDeleted: boolean
}

export interface MessageDocument extends Omit<MessageEntity, '_id'>, Document {}

const messageSchema = new Schema<MessageDocument>(
  {
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
)

messageSchema.index({ channelId: 1, createdAt: -1 })

export const MessageModel =
  (mongoose.models.Message as mongoose.Model<MessageDocument>) ||
  mongoose.model<MessageDocument>('Message', messageSchema)
