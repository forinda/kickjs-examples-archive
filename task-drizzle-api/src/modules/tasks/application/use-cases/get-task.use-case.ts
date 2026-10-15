import { Service, Inject } from '@forinda/kickjs'
import { TASK_REPOSITORY, type TaskRepository } from '@/modules/tasks/task.repository'

@Service()
export class GetTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly repo: TaskRepository,
  ) {}

  async execute(id: string) {
    return this.repo.findById(id)
  }
}
