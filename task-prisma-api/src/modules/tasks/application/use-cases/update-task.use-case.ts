import { Service, Inject } from '@forinda/kickjs'
import type { UpdateTaskDTO } from '../dtos/update-task.dto'
import { TASK_REPOSITORY, type TaskRepository } from '@/modules/tasks/task.repository'

@Service()
export class UpdateTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly repo: TaskRepository,
  ) {}

  async execute(id: string, dto: UpdateTaskDTO) {
    return this.repo.update(id, dto)
  }
}
