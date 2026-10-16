import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Autowired,
  Inject,
  Middleware,
  ApiQueryParams,
  reply,
  HttpException,
} from '@forinda/kickjs'

import type { RequestContext } from '@forinda/kickjs'
import { ApiTags, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { authBridgeMiddleware } from '@/middleware/auth-bridge.middleware'
import { requireWorkspaceMember } from '@/guards/workspace-membership.guard'
import { access, requireAccess, requiredQuery, workspaceIdOf } from '@/guards/resource-access.guard'
import { getUser } from '@/shared/auth'
import { successResponse } from '@/shared/api-response'
import { TASK_REPOSITORY, type TaskRepository } from './task.repository'
import { TASK_ASSIGNEE_REPOSITORY, type TaskAssigneeRepository } from './task-assignee.repository'
import { TaskService } from './task.service'
import { createTaskSchema, updateTaskSchema } from './task.dto'
import { TASK_QUERY_CONFIG } from './task.constants'

@Controller()
@Middleware(authBridgeMiddleware)
@ApiBearerAuth()
export class TaskController {
  @Autowired() private taskService!: TaskService
  @Inject(TASK_REPOSITORY) private readonly repo!: TaskRepository
  @Inject(TASK_ASSIGNEE_REPOSITORY) private readonly assigneeRepo!: TaskAssigneeRepository

  @Post('/', { body: createTaskSchema, name: 'CreateTask' })
  @ApiTags('Task')
  async create(ctx: RequestContext) {
    // The project must be the caller's, and in the workspace the body names.
    if ((await workspaceIdOf('project', ctx.body.projectId)) !== ctx.body.workspaceId) {
      throw HttpException.notFound('Project not found')
    }
    await requireWorkspaceMember(ctx, ctx.body.workspaceId, 'Project not found')
    const user = getUser(ctx)
    const result = await this.taskService.create(ctx.body, user.id)
    return reply.created(successResponse(result))
  }

  @Get('/')
  @ApiTags('Task')
  @ApiQueryParams(TASK_QUERY_CONFIG)
  async list(ctx: RequestContext) {
    const projectId = requiredQuery(ctx, 'projectId')
    await requireAccess(ctx, 'project', projectId)
    return ctx.paginate((parsed) => this.repo.findPaginated(parsed, projectId), TASK_QUERY_CONFIG)
  }

  @Middleware(access('task'))
  @Get('/:id')
  @ApiTags('Task')
  async getById(ctx: RequestContext) {
    const result = await this.repo.findById(ctx.params.id)
    if (!result) throw HttpException.notFound('Task not found')
    return successResponse(result)
  }

  @Middleware(access('task'))
  @Put('/:id', { body: updateTaskSchema, name: 'UpdateTask' })
  @ApiTags('Task')
  async update(ctx: RequestContext) {
    const result = await this.repo.update(ctx.params.id, ctx.body)
    return successResponse(result)
  }

  @Middleware(access('task'))
  @Delete('/:id')
  @ApiTags('Task')
  async remove(ctx: RequestContext) {
    await this.repo.delete(ctx.params.id)
    return reply.noContent()
  }

  // --- Assignees ---

  @Middleware(access('task'))
  @Get('/:id/assignees')
  @ApiTags('Task')
  async getAssignees(ctx: RequestContext) {
    const assignees = await this.assigneeRepo.findByTask(ctx.params.id)
    return successResponse(assignees)
  }

  @Middleware(access('task'))
  @Post('/:id/assignees/:userId')
  @ApiTags('Task')
  async addAssignee(ctx: RequestContext) {
    const result = await this.assigneeRepo.add(ctx.params.id, ctx.params.userId)
    return reply.created(successResponse(result))
  }

  @Middleware(access('task'))
  @Delete('/:id/assignees/:userId')
  @ApiTags('Task')
  async removeAssignee(ctx: RequestContext) {
    await this.assigneeRepo.remove(ctx.params.id, ctx.params.userId)
    return reply.noContent()
  }

  // --- Subtasks ---

  @Middleware(access('task'))
  @Get('/:id/subtasks')
  @ApiTags('Task')
  async listSubtasks(ctx: RequestContext) {
    const subtasks = await this.repo.findSubtasks(ctx.params.id)
    return successResponse(subtasks)
  }
}
