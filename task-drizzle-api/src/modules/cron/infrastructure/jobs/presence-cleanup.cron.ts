import { Service, Logger, Cron } from '@forinda/kickjs'

const logger = Logger.for('PresenceCronJobs')

@Service()
export class PresenceCronJobs {
  @Cron('*/5 * * * *', { description: 'Clean up stale presence entries' })
  async cleanupPresence() {
    logger.info('Running presence cleanup... (placeholder)')
    // TODO: Check presence map, remove entries with stale heartbeats
  }
}
