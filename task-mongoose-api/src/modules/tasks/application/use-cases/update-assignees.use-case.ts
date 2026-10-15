import { Service, Inject, HttpException, Logger } from '@forinda/kickjs'
import { JOB_DISPATCHER, type JobDispatcher } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'
import { ErrorCode } from '@/shared/constants/error-codes'
import type { ITaskRepository } from '../../domain/repositories/task.repository'
import type { IUserRepository } from '@/modules/users/domain/repositories/user.repository'

const logger = Logger.for('UpdateAssigneesUseCase')

@Service()
export class UpdateAssigneesUseCase {
  constructor(
    @Inject(TOKENS.TASK_REPOSITORY) private taskRepo: ITaskRepository,
    @Inject(TOKENS.USER_REPOSITORY) private userRepo: IUserRepository,
    @Inject(JOB_DISPATCHER) private jobs: JobDispatcher,
  ) {}

  async execute(taskId: string, assigneeIds: string[], assignerName?: string) {
    const oldTask = await this.taskRepo.findById(taskId)
    const task = await this.taskRepo.update(taskId, { assigneeIds: assigneeIds as any[] })
    if (!task) throw HttpException.notFound(ErrorCode.TASK_NOT_FOUND)

    // Find newly added assignees and queue notification emails
    const oldIds = new Set(oldTask?.assigneeIds.map((id) => id.toString()) ?? [])
    const newAssignees = assigneeIds.filter((id) => !oldIds.has(id))

    for (const assigneeId of newAssignees) {
      try {
        const user = await this.userRepo.findById(assigneeId)
        if (user) {
          await this.jobs.dispatch('email', 'send-task-assigned', {
            email: user.email,
            taskKey: task.key,
            taskTitle: task.title,
            assignerName: assignerName ?? 'Someone',
          })
        }
      } catch {
        logger.warn(`Failed to queue task-assigned email for ${assigneeId}`)
      }
    }

    return task
  }
}
