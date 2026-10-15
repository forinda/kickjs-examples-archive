import { Service, Inject } from '@forinda/kickjs'
import { TASK_REPOSITORY, type TaskRepository } from '@/modules/tasks/task.repository'

@Service()
export class ListSubtasksUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly repo: TaskRepository,
  ) {}

  async execute(parentTaskId: string) {
    return this.repo.findSubtasks(parentTaskId)
  }
}
