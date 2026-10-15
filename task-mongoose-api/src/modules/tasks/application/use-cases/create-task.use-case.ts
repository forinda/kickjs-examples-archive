import { Service, Inject } from '@forinda/kickjs'
import type { CreateTaskDto } from '../dtos/create-task.dto'
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '@/modules/projects/infrastructure/repositories/project.repository'
import {
  TASK_REPOSITORY,
  type TaskRepository,
} from '@/modules/tasks/infrastructure/repositories/task.repository'

@Service()
export class CreateTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY) private taskRepo: TaskRepository,
    @Inject(PROJECT_REPOSITORY) private projectRepo: ProjectRepository,
  ) {}

  async execute(projectId: string, userId: string, dto: CreateTaskDto) {
    const project = await this.projectRepo.findById(projectId)
    if (!project) throw new Error('Project not found')

    const counter = await this.projectRepo.incrementTaskCounter(projectId)
    const key = `${project.key}-${counter}`

    const maxOrderTask = await this.taskRepo.findByProject(projectId)
    const maxOrder =
      maxOrderTask.length > 0
        ? Math.max(...maxOrderTask.filter((t) => t.status === dto.status).map((t) => t.orderIndex))
        : -1

    return this.taskRepo.create({
      ...dto,
      projectId: projectId as any,
      workspaceId: project.workspaceId,
      key,
      reporterId: userId as any,
      assigneeIds: dto.assigneeIds as any[],
      labelIds: dto.labelIds as any[],
      parentTaskId: dto.parentTaskId as any,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      orderIndex: maxOrder + 1,
    })
  }
}
