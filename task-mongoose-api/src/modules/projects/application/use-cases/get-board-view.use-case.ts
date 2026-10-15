import { Service, Inject, HttpException } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/constants/error-codes'
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '@/modules/projects/infrastructure/repositories/project.repository'
import {
  TASK_REPOSITORY,
  type TaskRepository,
} from '@/modules/tasks/infrastructure/repositories/task.repository'

@Service()
export class GetBoardViewUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY) private projectRepo: ProjectRepository,
    @Inject(TASK_REPOSITORY) private taskRepo: TaskRepository,
  ) {}

  async execute(projectId: string) {
    const project = await this.projectRepo.findById(projectId)
    if (!project) {
      throw HttpException.notFound(ErrorCode.PROJECT_NOT_FOUND)
    }

    const tasks = await this.taskRepo.findByProject(projectId)

    const columns = project.statusColumns
      .sort((a, b) => a.order - b.order)
      .map((col) => ({
        ...col,
        tasks: tasks
          .filter((t) => t.status === col.name)
          .sort((a, b) => a.orderIndex - b.orderIndex),
      }))

    return { project, columns }
  }
}
