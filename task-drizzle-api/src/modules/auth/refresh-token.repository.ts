import { createToken } from '@forinda/kickjs'
import { eq, lt } from 'drizzle-orm'
import type { AppDatabase } from '@/db'
import { refreshTokens } from '@/db/schema'

export type RefreshToken = typeof refreshTokens.$inferSelect
export type NewRefreshToken = typeof refreshTokens.$inferInsert

export function createRefreshTokenRepository(db: AppDatabase) {
  return {
    async create(data: { userId: string; token: string; expiresAt: Date }): Promise<RefreshToken> {
      const [result] = await db.insert(refreshTokens).values(data).returning()
      return result
    },

    async findByToken(token: string): Promise<RefreshToken | null> {
      const [result] = await db.select().from(refreshTokens).where(eq(refreshTokens.token, token))
      return result ?? null
    },

    async deleteByToken(token: string): Promise<boolean> {
      const result = await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.token, token))
        .returning()
      return result.length > 0
    },

    async deleteByUserId(userId: string): Promise<void> {
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId))
    },

    async deleteExpired(): Promise<number> {
      const result = await db
        .delete(refreshTokens)
        .where(lt(refreshTokens.expiresAt, new Date()))
        .returning()
      return result.length
    },
  }
}

export type RefreshTokenRepository = ReturnType<typeof createRefreshTokenRepository>

export const REFRESH_TOKEN_REPOSITORY = createToken<RefreshTokenRepository>(
  'app/RefreshToken/repository',
)
