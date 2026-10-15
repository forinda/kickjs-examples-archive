import {
  Controller,
  Inject,
  Get,
  Post,
  Put,
  Delete,
  Middleware,
  reply,
  HttpException,
  type RequestContext,
} from '@forinda/kickjs'
import { ApiTags, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { authBridgeMiddleware } from '@/middleware/auth-bridge.middleware'
import { successResponse } from '@/shared/api-response'
import { createProjectSchema, updateProjectSchema } from './project.dto'
import { PROJECT_REPOSITORY, type ProjectRepository } from './project.repository'

@Controller()
@Middleware(authBridgeMiddleware)
@ApiBearerAuth()
export class ProjectController {
  @Inject(PROJECT_REPOSITORY) private readonly repo!: ProjectRepository

  @Post('/', { body: createProjectSchema, name: 'CreateProject' })
  @ApiTags('Project')
  async create(ctx: RequestContext) {
    const result = await this.repo.create(ctx.body)
    return reply.created(successResponse(result))
  }

  @Get('/workspace/:workspaceId')
  @ApiTags('Project')
  async listByWorkspace(ctx: RequestContext) {
    const projects = await this.repo.findByWorkspace(ctx.params.workspaceId)
    return successResponse(projects)
  }

  @Get('/:id')
  @ApiTags('Project')
  async getById(ctx: RequestContext) {
    const result = await this.repo.findById(ctx.params.id)
    if (!result) throw HttpException.notFound('Project not found')
    return successResponse(result)
  }

  @Put('/:id', { body: updateProjectSchema, name: 'UpdateProject' })
  @ApiTags('Project')
  async update(ctx: RequestContext) {
    const result = await this.repo.update(ctx.params.id, ctx.body)
    return successResponse(result)
  }

  @Delete('/:id')
  @ApiTags('Project')
  async remove(ctx: RequestContext) {
    await this.repo.delete(ctx.params.id)
    return reply.noContent()
  }
}
