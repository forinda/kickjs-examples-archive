import { Service, Autowired, Logger, Cron } from '@forinda/kickjs'
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '@/modules/auth/refresh-token.repository'

const logger = Logger.for('CleanupCronJobs')

@Service()
export class CleanupCronJobs {
  @Autowired(REFRESH_TOKEN_REPOSITORY) private tokenRepo!: RefreshTokenRepository

  @Cron('0 3 * * *', { description: 'Clean up expired refresh tokens', timezone: 'UTC' })
  async cleanupTokens() {
    logger.info('Running token cleanup...')
    const deleted = await this.tokenRepo.deleteExpired()
    logger.info(`Cleaned up ${deleted} expired refresh tokens`)
  }
}
