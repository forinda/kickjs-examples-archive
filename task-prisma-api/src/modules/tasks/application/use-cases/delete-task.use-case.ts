import { Service, Inject } from '@forinda/kickjs'
import { TASK_REPOSITORY, type TaskRepository } from '@/modules/tasks/task.repository'

@Service()
export class DeleteTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly repo: TaskRepository,
  ) {}

  async execute(id: string) {
    await this.repo.delete(id)
  }
}
