import { Service, Autowired, Logger, Job, Process, Inject } from '@forinda/kickjs'
import type { Job as BullMQJob } from 'bullmq'
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '@/modules/notifications/notification.repository'

const logger = Logger.for('NotificationProcessor')

@Service()
@Job('notifications')
export class NotificationProcessor {
  @Inject(NOTIFICATION_REPOSITORY) private notificationRepo!: NotificationRepository

  @Process('create-notification')
  async createNotification(
    job: BullMQJob<{
      recipientId: string
      type: 'task_assigned' | 'mentioned' | 'workspace_invite' | 'task_overdue' | 'comment_added'
      title: string
      body: string
      metadata: Record<string, unknown>
    }>,
  ) {
    logger.info(`Creating notification for ${job.data.recipientId}: ${job.data.type}`)
    await this.notificationRepo.create(job.data)
  }
}
