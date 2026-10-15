import { Service, Inject, HttpException } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/constants/error-codes'
import type { UpdateTaskDto } from '../dtos/update-task.dto'
import {
  TASK_REPOSITORY,
  type TaskRepository,
} from '@/modules/tasks/infrastructure/repositories/task.repository'

@Service()
export class UpdateTaskUseCase {
  constructor(@Inject(TASK_REPOSITORY) private taskRepo: TaskRepository) {}

  async execute(taskId: string, dto: UpdateTaskDto) {
    const updateData: any = { ...dto }
    if (dto.dueDate) updateData.dueDate = new Date(dto.dueDate)
    if (dto.dueDate === null) updateData.dueDate = null

    const task = await this.taskRepo.update(taskId, updateData)
    if (!task) throw HttpException.notFound(ErrorCode.TASK_NOT_FOUND)
    return task
  }
}
