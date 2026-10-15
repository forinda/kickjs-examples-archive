import { Inject, Service, Logger } from '@forinda/kickjs'
import { Job, Process } from '@forinda/kickjs'
import type { Job as BullMQJob } from 'bullmq'
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '@/modules/notifications/infrastructure/repositories/notification.repository'

const logger = Logger.for('NotificationProcessor')

@Service()
@Job('notifications')
export class NotificationProcessor {
  @Inject(NOTIFICATION_REPOSITORY) private notificationRepo!: NotificationRepository

  @Process('create-notification')
  async createNotification(
    job: BullMQJob<{
      recipientId: string
      type: string
      title: string
      body: string
      metadata: Record<string, any>
    }>,
  ) {
    logger.info(`Creating notification for ${job.data.recipientId}: ${job.data.type}`)
    await this.notificationRepo.create({
      recipientId: job.data.recipientId as any,
      type: job.data.type as any,
      title: job.data.title,
      body: job.data.body,
      metadata: job.data.metadata,
    })
  }
}
