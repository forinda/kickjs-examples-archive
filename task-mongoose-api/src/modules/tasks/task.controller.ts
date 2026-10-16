import {
  Inject,
  reply,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Middleware,
  ApiQueryParams,
  Autowired,
  type RequestContext,
  HttpException,
} from '@forinda/kickjs'
import { taskAccessGuard } from '@/guards/task-access.guard'
import { z } from 'zod'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { ErrorCode } from '@/shared/error-codes'
import { TASK_QUERY_CONFIG, paginate } from '@/shared/query-configs'
import {
  createTaskSchema,
  updateTaskSchema,
  changeStatusSchema,
  updateAssigneesSchema,
  reorderTaskSchema,
} from './task.dto'
import { getUser } from '@/auth'

import { TasksService } from './task.service'
import { successResponse } from '@/shared/api-response'
import { projectAccessGuard } from '@/guards/project-access.guard'
import { TASK_REPOSITORY, type TaskRepository } from './task.repository'
import { LABEL_REPOSITORY, type LabelRepository } from '@/modules/labels/label.repository'
import { requireOwnerOrAdmin, requireTargetMember } from '@/guards/workspace-membership.guard'

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller()
export class TasksController {
  @Autowired() private tasksService!: TasksService
  @Inject(TASK_REPOSITORY) private taskRepo!: TaskRepository
  @Inject(LABEL_REPOSITORY) private labelRepo!: LabelRepository

  /**
   * Ids a task body points at must live in the task's workspace: assignees are
   * its members (404 USER_NOT_FOUND otherwise), labels its labels, a parent a
   * task of the same project.
   */
  private async checkRefs(
    workspaceId: string,
    projectId: string,
    refs: { assigneeIds?: string[]; labelIds?: string[]; parentTaskId?: string },
  ) {
    for (const userId of refs.assigneeIds ?? []) await requireTargetMember(workspaceId, userId)
    for (const labelId of refs.labelIds ?? []) {
      const label = await this.labelRepo.findById(labelId)
      if (label?.workspaceId.toString() !== workspaceId) {
        throw HttpException.notFound(ErrorCode.LABEL_NOT_FOUND)
      }
    }
    if (refs.parentTaskId) {
      const parent = await this.taskRepo.findById(refs.parentTaskId)
      if (parent?.projectId.toString() !== projectId) {
        throw HttpException.notFound(ErrorCode.TASK_NOT_FOUND)
      }
    }
  }

  @Post('/projects/:projectId/tasks', {
    params: z.object({ projectId: z.string() }),
    body: createTaskSchema,
  })
  @Middleware(projectAccessGuard)
  @ApiOperation({ summary: 'Create a new task in a project' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to project' })
  async create(ctx: RequestContext) {
    const user = getUser(ctx)
    await this.checkRefs(ctx.get('project')!.workspaceId.toString(), ctx.params.projectId, ctx.body)
    const result = await this.tasksService.create(ctx.params.projectId, user.id, ctx.body)
    return reply.created(successResponse(result, 'Task created'))
  }

  @Get('/projects/:projectId/tasks', {
    params: z.object({ projectId: z.string() }),
  })
  @Middleware(projectAccessGuard)
  @ApiOperation({ summary: 'List tasks in a project with optional filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of tasks returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to project' })
  @ApiQueryParams(TASK_QUERY_CONFIG)
  async list(ctx: RequestContext) {
    return paginate(
      ctx,
      (parsed) => this.taskRepo.findPaginated(parsed, ctx.params.projectId),
      TASK_QUERY_CONFIG,
    )
  }

  @Get('/tasks/:taskId', { params: z.object({ taskId: z.string() }) })
  @ApiOperation({ summary: 'Get a single task by ID' })
  @ApiResponse({ status: 200, description: 'Task returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @Middleware(taskAccessGuard)
  async getOne(ctx: RequestContext) {
    const task = await this.taskRepo.findById(ctx.params.taskId)
    if (!task) throw HttpException.notFound(ErrorCode.TASK_NOT_FOUND)
    return successResponse(task)
  }

  @Patch('/tasks/:taskId', { params: z.object({ taskId: z.string() }), body: updateTaskSchema })
  @ApiOperation({ summary: 'Update a task' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @Middleware(taskAccessGuard)
  async update(ctx: RequestContext) {
    // Any workspace member may edit a task.
    const task = ctx.get('task')!
    await this.checkRefs(task.workspaceId.toString(), task.projectId.toString(), ctx.body)
    const result = await this.tasksService.update(ctx.params.taskId, ctx.body)
    return successResponse(result)
  }

  @Delete('/tasks/:taskId', { params: z.object({ taskId: z.string() }) })
  @ApiOperation({ summary: 'Delete a task' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @Middleware(taskAccessGuard)
  async delete(ctx: RequestContext) {
    // Deleting is for the task's reporter or a workspace admin.
    requireOwnerOrAdmin(ctx.get('workspaceMember')!, ctx.get('task')!.reporterId, getUser(ctx).id)
    const deleted = await this.taskRepo.delete(ctx.params.taskId)
    if (!deleted) throw HttpException.notFound(ErrorCode.TASK_NOT_FOUND)
    return successResponse(null, 'Task deleted')
  }

  @Patch('/tasks/:taskId/status', {
    params: z.object({ taskId: z.string() }),
    body: changeStatusSchema,
  })
  @ApiOperation({ summary: 'Change the status of a task' })
  @ApiResponse({ status: 200, description: 'Task status updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @Middleware(taskAccessGuard)
  async changeStatus(ctx: RequestContext) {
    const result = await this.tasksService.changeStatus(ctx.params.taskId, ctx.body.status)
    return successResponse(result)
  }

  @Patch('/tasks/:taskId/assignees', {
    params: z.object({ taskId: z.string() }),
    body: updateAssigneesSchema,
  })
  @ApiOperation({ summary: 'Update assignees for a task' })
  @ApiResponse({ status: 200, description: 'Task assignees updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @Middleware(taskAccessGuard)
  async updateAssignees(ctx: RequestContext) {
    await this.checkRefs(ctx.get('task')!.workspaceId.toString(), '', {
      assigneeIds: ctx.body.assigneeIds,
    })
    const result = await this.tasksService.updateAssignees(ctx.params.taskId, ctx.body.assigneeIds)
    return successResponse(result)
  }

  @Post('/tasks/:taskId/reorder', {
    params: z.object({ taskId: z.string() }),
    body: reorderTaskSchema,
  })
  @ApiOperation({ summary: 'Reorder a task within its column' })
  @ApiResponse({ status: 200, description: 'Task reordered successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @Middleware(taskAccessGuard)
  async reorder(ctx: RequestContext) {
    const result = await this.tasksService.reorder(ctx.params.taskId, ctx.body)
    return successResponse(result)
  }

  @Get('/tasks/:taskId/subtasks', { params: z.object({ taskId: z.string() }) })
  @ApiOperation({ summary: 'List subtasks of a task' })
  @ApiResponse({ status: 200, description: 'Subtasks returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @Middleware(taskAccessGuard)
  async subtasks(ctx: RequestContext) {
    const subtasks = await this.taskRepo.findSubtasks(ctx.params.taskId)
    return successResponse(subtasks)
  }
}
