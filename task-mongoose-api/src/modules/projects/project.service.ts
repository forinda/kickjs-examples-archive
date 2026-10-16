import { Service, Inject, HttpException } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/error-codes'
import type { CreateProjectDto, UpdateProjectDto } from './project.dto'
import { PROJECT_REPOSITORY, type ProjectRepository } from './project.repository'
import { TASK_REPOSITORY, type TaskRepository } from '@/modules/tasks/task.repository'

@Service()
export class ProjectsService {
  constructor(
    @Inject(PROJECT_REPOSITORY) private projectRepo: ProjectRepository,
    @Inject(TASK_REPOSITORY) private taskRepo: TaskRepository,
  ) {}

  async create(workspaceId: string, dto: CreateProjectDto) {
    const existing = await this.projectRepo.findByKeyAndWorkspace(dto.key, workspaceId)
    if (existing) {
      throw HttpException.conflict(ErrorCode.PROJECT_KEY_EXISTS)
    }

    return this.projectRepo.create({
      ...dto,
      workspaceId: workspaceId as any,
      leadId: dto.leadId as any,
    })
  }

  async update(projectId: string, dto: UpdateProjectDto) {
    const project = await this.projectRepo.update(projectId, dto as any)
    if (!project) {
      throw HttpException.notFound(ErrorCode.PROJECT_NOT_FOUND)
    }
    return project
  }

  async getBoardView(projectId: string) {
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
