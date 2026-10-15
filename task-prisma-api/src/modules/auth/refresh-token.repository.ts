import { createToken } from '@forinda/kickjs'
import type { PrismaClient } from '@/generated/prisma/client'
import type { RefreshToken } from '@/generated/prisma/client'

export type { RefreshToken }

export function createRefreshTokenRepository(prisma: PrismaClient) {
  return {
    async create(data: { userId: string; token: string; expiresAt: Date }) {
      return prisma.refreshToken.create({ data })
    },

    async findByToken(token: string) {
      return prisma.refreshToken.findUnique({ where: { token } })
    },

    async deleteByToken(token: string): Promise<boolean> {
      try {
        await prisma.refreshToken.delete({ where: { token } })
        return true
      } catch {
        return false
      }
    },

    async deleteByUserId(userId: string): Promise<void> {
      await prisma.refreshToken.deleteMany({ where: { userId } })
    },

    async deleteExpired(): Promise<number> {
      const result = await prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      })
      return result.count
    },
  }
}

export type RefreshTokenRepository = ReturnType<typeof createRefreshTokenRepository>

export const REFRESH_TOKEN_REPOSITORY = createToken<RefreshTokenRepository>(
  'app/RefreshToken/repository',
)
