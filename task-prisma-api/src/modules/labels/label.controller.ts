import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Inject,
  Middleware,
  ApiQueryParams,
  reply,
  HttpException,
} from '@forinda/kickjs'

import type { RequestContext } from '@forinda/kickjs'
import { ApiTags, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { authBridgeMiddleware } from '@/middleware/auth-bridge.middleware'
import { successResponse } from '@/shared/api-response'
import { LABEL_REPOSITORY, type LabelRepository } from './label.repository'
import { TASK_LABEL_REPOSITORY, type TaskLabelRepository } from './task-label.repository'
import { createLabelSchema, updateLabelSchema } from './label.dto'
import { LABEL_QUERY_CONFIG } from './label.constants'

@Controller()
@Middleware(authBridgeMiddleware)
@ApiBearerAuth()
export class LabelController {
  @Inject(LABEL_REPOSITORY) private readonly repo!: LabelRepository
  @Inject(TASK_LABEL_REPOSITORY) private readonly taskLabelRepo!: TaskLabelRepository

  @Post('/', { body: createLabelSchema, name: 'CreateLabel' })
  @ApiTags('Label')
  async create(ctx: RequestContext) {
    const result = await this.repo.create(ctx.body)
    return reply.created(successResponse(result))
  }

  @Get('/')
  @ApiTags('Label')
  @ApiQueryParams(LABEL_QUERY_CONFIG)
  async list(ctx: RequestContext) {
    return ctx.paginate(
      (parsed) => this.repo.findPaginated(parsed, ctx.query.workspaceId as string | undefined),
      LABEL_QUERY_CONFIG,
    )
  }

  @Get('/:id')
  @ApiTags('Label')
  async getById(ctx: RequestContext) {
    const result = await this.repo.findById(ctx.params.id)
    if (!result) throw HttpException.notFound('Label not found')
    return successResponse(result)
  }

  @Put('/:id', { body: updateLabelSchema, name: 'UpdateLabel' })
  @ApiTags('Label')
  async update(ctx: RequestContext) {
    const result = await this.repo.update(ctx.params.id, ctx.body)
    return successResponse(result)
  }

  @Delete('/:id')
  @ApiTags('Label')
  async remove(ctx: RequestContext) {
    await this.repo.delete(ctx.params.id)
    return reply.noContent()
  }

  // --- Task Labels ---

  @Get('/tasks/:taskId')
  @ApiTags('Label')
  async getTaskLabels(ctx: RequestContext) {
    const labels = await this.taskLabelRepo.findByTask(ctx.params.taskId)
    return successResponse(labels)
  }

  @Post('/tasks/:taskId/:labelId')
  @ApiTags('Label')
  async addToTask(ctx: RequestContext) {
    const result = await this.taskLabelRepo.add(ctx.params.taskId, ctx.params.labelId)
    return reply.created(successResponse(result))
  }

  @Delete('/tasks/:taskId/:labelId')
  @ApiTags('Label')
  async removeFromTask(ctx: RequestContext) {
    await this.taskLabelRepo.remove(ctx.params.taskId, ctx.params.labelId)
    return reply.noContent()
  }
}
