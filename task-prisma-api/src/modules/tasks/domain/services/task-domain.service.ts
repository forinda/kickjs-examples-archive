import { Service, Inject, HttpException } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/constants/error-codes'
import type { TaskRepository, Task } from '@/modules/tasks/task.repository'
import { TASK_REPOSITORY } from '@/modules/tasks/task.repository'

@Service()
export class TaskDomainService {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly repo: TaskRepository,
  ) {}

  async ensureExists(id: string): Promise<Task> {
    const task = await this.repo.findById(id)
    if (!task) {
      throw HttpException.notFound(ErrorCode.TASK_NOT_FOUND)
    }
    return task
  }
}
