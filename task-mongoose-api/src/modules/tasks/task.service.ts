import {
  Service,
  Inject,
  HttpException,
  Logger,
  JOB_DISPATCHER,
  type JobDispatcher,
} from '@forinda/kickjs'
import { ErrorCode } from '@/shared/error-codes'
import type { CreateTaskDto, ReorderTaskDto, UpdateTaskDto } from './task.dto'
import { TASK_REPOSITORY, type TaskRepository } from './task.repository'
import { PROJECT_REPOSITORY, type ProjectRepository } from '@/modules/projects/project.repository'
import { USER_REPOSITORY, type UserRepository } from '@/modules/users/user.repository'

const logger = Logger.for('TasksService')

@Service()
export class TasksService {
  constructor(
    @Inject(TASK_REPOSITORY) private taskRepo: TaskRepository,
    @Inject(PROJECT_REPOSITORY) private projectRepo: ProjectRepository,
    @Inject(USER_REPOSITORY) private userRepo: UserRepository,
    @Inject(JOB_DISPATCHER) private jobs: JobDispatcher,
  ) {}

  async create(projectId: string, userId: string, dto: CreateTaskDto) {
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

  async update(taskId: string, dto: UpdateTaskDto) {
    const updateData: any = { ...dto }
    if (dto.dueDate) updateData.dueDate = new Date(dto.dueDate)
    if (dto.dueDate === null) updateData.dueDate = null

    const task = await this.taskRepo.update(taskId, updateData)
    if (!task) throw HttpException.notFound(ErrorCode.TASK_NOT_FOUND)
    return task
  }

  async changeStatus(taskId: string, status: string) {
    const task = await this.taskRepo.update(taskId, { status })
    if (!task) throw HttpException.notFound(ErrorCode.TASK_NOT_FOUND)
    return task
  }

  async reorder(taskId: string, dto: ReorderTaskDto) {
    const task = await this.taskRepo.update(taskId, {
      status: dto.status,
      orderIndex: dto.orderIndex,
    })
    if (!task) throw HttpException.notFound(ErrorCode.TASK_NOT_FOUND)
    return task
  }

  async updateAssignees(taskId: string, assigneeIds: string[], assignerName?: string) {
    const oldTask = await this.taskRepo.findById(taskId)
    const task = await this.taskRepo.update(taskId, { assigneeIds: assigneeIds as any[] })
    if (!task) throw HttpException.notFound(ErrorCode.TASK_NOT_FOUND)

    // Find newly added assignees and queue notification emails
    const oldIds = new Set(oldTask?.assigneeIds.map((id) => id.toString()) ?? [])
    const newAssignees = assigneeIds.filter((id) => !oldIds.has(id))

    for (const assigneeId of newAssignees) {
      try {
        const user = await this.userRepo.findById(assigneeId)
        if (user) {
          await this.jobs.dispatch('email', 'send-task-assigned', {
            email: user.email,
            taskKey: task.key,
            taskTitle: task.title,
            assignerName: assignerName ?? 'Someone',
          })
        }
      } catch {
        logger.warn(`Failed to queue task-assigned email for ${assigneeId}`)
      }
    }

    return task
  }
}
