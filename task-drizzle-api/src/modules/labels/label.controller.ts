import {
  Controller,
  Inject,
  Get,
  Post,
  Put,
  Delete,
  Middleware,
  ApiQueryParams,
  reply,
  HttpException,
  type RequestContext,
} from '@forinda/kickjs'

import { ApiTags, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { authBridgeMiddleware } from '@/middleware/auth-bridge.middleware'
import { requireWorkspaceMember } from '@/guards/workspace-membership.guard'
import { access, requiredQuery } from '@/guards/resource-access.guard'
import { successResponse } from '@/shared/api-response'
import { LABEL_QUERY_CONFIG } from './label.constants'
import { createLabelSchema, updateLabelSchema } from './label.dto'
import { LABEL_REPOSITORY, type LabelRepository } from './label.repository'
import { TASK_LABEL_REPOSITORY, type TaskLabelRepository } from './task-label.repository'

@Controller()
@Middleware(authBridgeMiddleware)
@ApiBearerAuth()
export class LabelController {
  @Inject(LABEL_REPOSITORY) private readonly repo!: LabelRepository
  @Inject(TASK_LABEL_REPOSITORY) private readonly taskLabelRepo!: TaskLabelRepository

  @Post('/', { body: createLabelSchema, name: 'CreateLabel' })
  @ApiTags('Label')
  async create(ctx: RequestContext) {
    await requireWorkspaceMember(ctx, ctx.body.workspaceId)
    const result = await this.repo.create(ctx.body)
    return reply.created(successResponse(result))
  }

  @Get('/')
  @ApiTags('Label')
  @ApiQueryParams(LABEL_QUERY_CONFIG)
  async list(ctx: RequestContext) {
    const workspaceId = requiredQuery(ctx, 'workspaceId')
    await requireWorkspaceMember(ctx, workspaceId)
    return ctx.paginate(
      (parsed) => this.repo.findPaginated(parsed, workspaceId),
      LABEL_QUERY_CONFIG,
    )
  }

  @Middleware(access('label'))
  @Get('/:id')
  @ApiTags('Label')
  async getById(ctx: RequestContext) {
    const result = await this.repo.findById(ctx.params.id)
    if (!result) throw HttpException.notFound('Label not found')
    return successResponse(result)
  }

  @Middleware(access('label'))
  @Put('/:id', { body: updateLabelSchema, name: 'UpdateLabel' })
  @ApiTags('Label')
  async update(ctx: RequestContext) {
    const result = await this.repo.update(ctx.params.id, ctx.body)
    return successResponse(result)
  }

  @Middleware(access('label'))
  @Delete('/:id')
  @ApiTags('Label')
  async remove(ctx: RequestContext) {
    await this.repo.delete(ctx.params.id)
    return reply.noContent()
  }

  // --- Task Labels ---

  @Middleware(access('task', 'taskId'))
  @Get('/tasks/:taskId')
  @ApiTags('Label')
  async getTaskLabels(ctx: RequestContext) {
    const labels = await this.taskLabelRepo.findByTask(ctx.params.taskId)
    return successResponse(labels)
  }

  @Middleware(access('task', 'taskId'), access('label', 'labelId'))
  @Post('/tasks/:taskId/:labelId')
  @ApiTags('Label')
  async addToTask(ctx: RequestContext) {
    const result = await this.taskLabelRepo.add(ctx.params.taskId, ctx.params.labelId)
    return reply.created(successResponse(result))
  }

  @Middleware(access('task', 'taskId'), access('label', 'labelId'))
  @Delete('/tasks/:taskId/:labelId')
  @ApiTags('Label')
  async removeFromTask(ctx: RequestContext) {
    await this.taskLabelRepo.remove(ctx.params.taskId, ctx.params.labelId)
    return reply.noContent()
  }
}
