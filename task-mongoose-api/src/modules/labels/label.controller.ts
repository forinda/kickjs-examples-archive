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
  type RequestContext,
  HttpException,
} from '@forinda/kickjs'
import { z } from 'zod'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { ErrorCode } from '@/shared/error-codes'
import { createLabelSchema, updateLabelSchema } from './label.dto'
import { successResponse } from '@/shared/api-response'
import { workspaceMembershipGuard } from '@/guards/workspace-membership.guard'
import { LABEL_QUERY_CONFIG } from '@/shared/query-configs'
import {
  LABEL_REPOSITORY,
  type LabelRepository,
} from './label.repository'

@ApiTags('Labels')
@ApiBearerAuth()
@Controller()
export class LabelsController {
  @Inject(LABEL_REPOSITORY) private labelRepo!: LabelRepository

  @Post('/workspaces/:workspaceId/labels', {
    params: z.object({ workspaceId: z.string() }),
    body: createLabelSchema,
  })
  @Middleware(workspaceMembershipGuard)
  @ApiOperation({ summary: 'Create a new label in a workspace' })
  @ApiResponse({ status: 201, description: 'Label created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a workspace member' })
  @ApiResponse({ status: 409, description: 'Label name already exists in workspace' })
  async create(ctx: RequestContext) {
    const existing = await this.labelRepo.findByNameAndWorkspace(
      ctx.body.name,
      ctx.params.workspaceId,
    )
    if (existing) throw HttpException.conflict(ErrorCode.LABEL_NAME_EXISTS)
    const label = await this.labelRepo.create({
      ...ctx.body,
      workspaceId: ctx.params.workspaceId as any,
    })
    return reply.created(successResponse(label))
  }

  @Get('/workspaces/:workspaceId/labels', { params: z.object({ workspaceId: z.string() }) })
  @Middleware(workspaceMembershipGuard)
  @ApiOperation({ summary: 'List all labels in a workspace' })
  @ApiResponse({ status: 200, description: 'List of labels returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a workspace member' })
  @ApiQueryParams(LABEL_QUERY_CONFIG)
  async list(ctx: RequestContext) {
    return ctx.paginate(
      (parsed) => this.labelRepo.findPaginated(parsed, { workspaceId: ctx.params.workspaceId }),
      LABEL_QUERY_CONFIG,
    )
  }

  @Patch('/labels/:labelId', { params: z.object({ labelId: z.string() }), body: updateLabelSchema })
  @ApiOperation({ summary: 'Update a label' })
  @ApiResponse({ status: 200, description: 'Label updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Label not found' })
  async update(ctx: RequestContext) {
    const label = await this.labelRepo.update(ctx.params.labelId, ctx.body)
    if (!label) throw HttpException.notFound(ErrorCode.LABEL_NOT_FOUND)
    return successResponse(label)
  }

  @Delete('/labels/:labelId', { params: z.object({ labelId: z.string() }) })
  @ApiOperation({ summary: 'Delete a label' })
  @ApiResponse({ status: 200, description: 'Label deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Label not found' })
  async delete(ctx: RequestContext) {
    const deleted = await this.labelRepo.delete(ctx.params.labelId)
    if (!deleted) throw HttpException.notFound(ErrorCode.LABEL_NOT_FOUND)
    return successResponse(null, 'Label deleted')
  }
}
