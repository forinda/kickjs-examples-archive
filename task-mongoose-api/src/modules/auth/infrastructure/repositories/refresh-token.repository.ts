import { createToken } from '@forinda/kickjs'
import type { Connection } from 'mongoose'
import { bindModel } from '@/shared/infrastructure/database/bind-model'
import { RefreshTokenModel as RefreshTokenModelDef } from '../schemas/refresh-token.schema'

/** Mongo-backed RefreshToken repository. `connection` is the one MongooseAdapter registers under MONGO_CONNECTION. */
export function createRefreshTokenRepository(connection: Connection) {
  const RefreshTokenModel = bindModel(connection, RefreshTokenModelDef)

  return {
    async create(data: { userId: string; token: string; expiresAt: Date }) {
      return RefreshTokenModel.create(data)
    },

    async findByToken(token: string) {
      return RefreshTokenModel.findOne({ token }).lean()
    },

    async deleteByToken(token: string) {
      const result = await RefreshTokenModel.deleteOne({ token })
      return result.deletedCount > 0
    },

    async deleteByUserId(userId: string) {
      await RefreshTokenModel.deleteMany({ userId })
    },

    async deleteExpired() {
      const result = await RefreshTokenModel.deleteMany({ expiresAt: { $lt: new Date() } })
      return result.deletedCount
    },
  }
}

export type RefreshTokenRepository = ReturnType<typeof createRefreshTokenRepository>

export const REFRESH_TOKEN_REPOSITORY = createToken<RefreshTokenRepository>(
  'app/RefreshToken/repository',
)
