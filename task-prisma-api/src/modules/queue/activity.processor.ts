import { Service, Logger, Inject } from '@forinda/kickjs'
import { Job, Process } from '@forinda/kickjs-queue'
import type { Job as BullMQJob } from 'bullmq'
import {
  ACTIVITY_REPOSITORY,
  type ActivityRepository,
} from '@/modules/activities/activity.repository'

const logger = Logger.for('ActivityProcessor')

@Service()
@Job('activity')
export class ActivityProcessor {
  @Inject(ACTIVITY_REPOSITORY) private readonly activityRepo!: ActivityRepository

  @Process('log-activity')
  async logActivity(
    job: BullMQJob<{
      workspaceId: string
      projectId?: string
      taskId?: string
      actorId: string
      action: string
      changes?: Record<string, unknown>
    }>,
  ) {
    logger.info(`Logging activity: ${job.data.action} by ${job.data.actorId}`)
    await this.activityRepo.create(job.data)
  }
}
