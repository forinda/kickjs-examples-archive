import mongoose, { Schema, type Document } from 'mongoose'
import type { BaseEntity } from '@/shared/base.entity'

export interface UserEntity extends BaseEntity {
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  avatarUrl?: string
  globalRole: 'superadmin' | 'user'
  isActive: boolean
  lastLoginAt?: Date
}

export interface UserDocument extends Omit<UserEntity, '_id'>, Document {}

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    avatarUrl: { type: String },
    globalRole: { type: String, enum: ['superadmin', 'user'], default: 'user' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
)

userSchema.index({ firstName: 'text', lastName: 'text', email: 'text' })

export const UserModel =
  (mongoose.models.User as mongoose.Model<UserDocument>) ||
  mongoose.model<UserDocument>('User', userSchema)
