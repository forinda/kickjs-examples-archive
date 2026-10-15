import { Service, Inject } from '@forinda/kickjs'
import type { ParsedQuery } from '@forinda/kickjs'
import { TASK_REPOSITORY, type TaskRepository } from '@/modules/tasks/task.repository'

@Service()
export class ListTasksUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly repo: TaskRepository,
  ) {}

  async execute(parsed: ParsedQuery, projectId?: string) {
    return this.repo.findPaginated(parsed, projectId)
  }
}
