import { Service, Inject, Logger } from '@forinda/kickjs'
import { Cron } from '@forinda/kickjs'
import { PRISMA_CLIENT } from '@/db/prisma'
import type { PrismaClient } from '@/generated/prisma/client'

const logger = Logger.for('CleanupCronJobs')

@Service()
export class CleanupCronJobs {
  constructor(@Inject(PRISMA_CLIENT) private prisma: PrismaClient) {}

  @Cron('0 3 * * *', { description: 'Clean up expired refresh tokens', timezone: 'UTC' })
  async cleanupTokens() {
    logger.info('Running token cleanup...')
    await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })
    logger.info('Cleaned up expired refresh tokens')
  }
}
