import { Service, Inject, HttpException } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/constants/error-codes'
import {
  TASK_REPOSITORY,
  type TaskRepository,
} from '@/modules/tasks/infrastructure/repositories/task.repository'

@Service()
export class ChangeStatusUseCase {
  constructor(@Inject(TASK_REPOSITORY) private taskRepo: TaskRepository) {}

  async execute(taskId: string, status: string) {
    const task = await this.taskRepo.update(taskId, { status })
    if (!task) throw HttpException.notFound(ErrorCode.TASK_NOT_FOUND)
    return task
  }
}
