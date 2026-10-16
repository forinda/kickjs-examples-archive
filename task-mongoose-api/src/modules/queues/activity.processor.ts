import { Inject, Service, Logger, Job, Process } from '@forinda/kickjs'
import type { Job as BullMQJob } from 'bullmq'
import {
  ACTIVITY_REPOSITORY,
  type ActivityRepository,
} from '@/modules/activities/activity.repository'

const logger = Logger.for('ActivityProcessor')

@Service()
@Job('activity')
export class ActivityProcessor {
  @Inject(ACTIVITY_REPOSITORY) private activityRepo!: ActivityRepository

  @Process('log-activity')
  async logActivity(
    job: BullMQJob<{
      workspaceId: string
      projectId?: string
      taskId?: string
      actorId: string
      action: string
      changes?: { field: string; from?: any; to?: any }
    }>,
  ) {
    logger.info(`Logging activity: ${job.data.action} by ${job.data.actorId}`)
    await this.activityRepo.create({
      workspaceId: job.data.workspaceId as any,
      projectId: job.data.projectId as any,
      taskId: job.data.taskId as any,
      actorId: job.data.actorId as any,
      action: job.data.action as any,
      changes: job.data.changes,
    })
  }
}
