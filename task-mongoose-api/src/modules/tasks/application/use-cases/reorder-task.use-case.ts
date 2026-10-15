import { Service, Inject, HttpException } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/constants/error-codes'
import type { ReorderTaskDto } from '../dtos/reorder-task.dto'
import {
  TASK_REPOSITORY,
  type TaskRepository,
} from '@/modules/tasks/infrastructure/repositories/task.repository'

@Service()
export class ReorderTaskUseCase {
  constructor(@Inject(TASK_REPOSITORY) private taskRepo: TaskRepository) {}

  async execute(taskId: string, dto: ReorderTaskDto) {
    const task = await this.taskRepo.update(taskId, {
      status: dto.status,
      orderIndex: dto.orderIndex,
    })
    if (!task) throw HttpException.notFound(ErrorCode.TASK_NOT_FOUND)
    return task
  }
}
