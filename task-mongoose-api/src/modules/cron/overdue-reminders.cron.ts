import {
  Service,
  Autowired,
  Logger,
  Cron,
  JOB_DISPATCHER,
  type JobDispatcher,
} from '@forinda/kickjs'
import {
  TASK_REPOSITORY,
  type TaskRepository,
} from '@/modules/tasks/task.repository'
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@/modules/users/user.repository'

const logger = Logger.for('TaskCronJobs')

@Service()
export class TaskCronJobs {
  @Autowired(TASK_REPOSITORY) private taskRepo!: TaskRepository
  @Autowired(USER_REPOSITORY) private userRepo!: UserRepository
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
