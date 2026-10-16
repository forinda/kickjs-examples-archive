import { Service, Inject } from '@forinda/kickjs'
import { PROJECT_REPOSITORY, type ProjectRepository } from '@/modules/projects/project.repository'
import { TASK_REPOSITORY, type TaskRepository } from './task.repository'
import { TASK_ASSIGNEE_REPOSITORY, type TaskAssigneeRepository } from './task-assignee.repository'
import type { CreateTaskDTO } from './task.dto'

@Service()
export class TaskService {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly taskRepo: TaskRepository,
    @Inject(TASK_ASSIGNEE_REPOSITORY)
    private readonly assigneeRepo: TaskAssigneeRepository,
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepo: ProjectRepository,
  ) {}

  async create(dto: CreateTaskDTO, reporterId: string) {
    // Atomic task key generation
    const counter = await this.projectRepo.incrementTaskCounter(dto.projectId)
    const key = `${counter.key}-${counter.taskCounter}`

    const { assigneeIds, ...taskData } = dto

    const task = await this.taskRepo.create({
      ...taskData,
      key,
      reporterId,
    })

    if (assigneeIds.length > 0) {
      await this.assigneeRepo.addMany(task.id, assigneeIds)
    }

    return task
  }
}
