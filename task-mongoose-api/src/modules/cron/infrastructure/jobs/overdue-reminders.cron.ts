import { Service, Autowired, Logger } from '@forinda/kickjs'
import { Cron } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'
import type { ITaskRepository } from '@/modules/tasks/domain/repositories/task.repository'
import type { IUserRepository } from '@/modules/users/domain/repositories/user.repository'
import { JOB_DISPATCHER, type JobDispatcher } from '@forinda/kickjs'

const logger = Logger.for('TaskCronJobs')

@Service()
export class TaskCronJobs {
  @Autowired(TOKENS.TASK_REPOSITORY) private taskRepo!: ITaskRepository
  @Autowired(TOKENS.USER_REPOSITORY) private userRepo!: IUserRepository
  @Autowired(JOB_DISPATCHER) private jobs!: JobDispatcher

  @Cron('0 9 * * *', { description: 'Send overdue task reminders', timezone: 'UTC' })
  async overdueReminders() {
    logger.info('Running overdue task reminders...')

    const overdueTasks = await this.taskRepo.findOverdue()
    for (const task of overdueTasks) {
      for (const assigneeId of task.assigneeIds) {
        const user = await this.userRepo.findById(assigneeId.toString())
        if (user) {
          await this.jobs.dispatch('email', 'send-overdue-reminder', {
            email: user.email,
            taskKey: task.key,
            taskTitle: task.title,
            dueDate: task.dueDate?.toISOString(),
          })
        }
      }
    }
    logger.info(`Sent reminders for ${overdueTasks.length} overdue tasks`)
  }
}
