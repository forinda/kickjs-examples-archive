import { Inject } from '@forinda/kickjs'
import {
  reply,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Middleware,
  Autowired,
  ApiQueryParams,
} from '@forinda/kickjs'
import type { RequestContext } from '@forinda/kickjs'
import { z } from 'zod'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { createProjectSchema } from '../application/dtos/create-project.dto'
import { updateProjectSchema } from '../application/dtos/update-project.dto'
import { CreateProjectUseCase } from '../application/use-cases/create-project.use-case'
import { UpdateProjectUseCase } from '../application/use-cases/update-project.use-case'
import { ListProjectsUseCase } from '../application/use-cases/list-projects.use-case'
import { GetBoardViewUseCase } from '../application/use-cases/get-board-view.use-case'
import { successResponse } from '@/shared/application/api-response.dto'
import { workspaceMembershipGuard } from '@/shared/guards/workspace-membership.guard'
import { projectAccessGuard } from '@/shared/guards/project-access.guard'
import { PROJECT_QUERY_CONFIG } from '@/shared/constants/query-configs'
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '@/modules/projects/infrastructure/repositories/project.repository'

@ApiTags('Projects')
@ApiBearerAuth()
@Controller()
export class ProjectsController {
  @Autowired() private createProjectUseCase!: CreateProjectUseCase
  @Autowired() private updateProjectUseCase!: UpdateProjectUseCase
  @Autowired() private listProjectsUseCase!: ListProjectsUseCase
  @Autowired() private getBoardViewUseCase!: GetBoardViewUseCase
  @Inject(PROJECT_REPOSITORY) private projectRepo!: ProjectRepository

  @Post('/workspaces/:workspaceId/projects', {
    params: z.object({ workspaceId: z.string() }),
    body: createProjectSchema,
  })
  @Middleware(workspaceMembershipGuard)
  @ApiOperation({ summary: 'Create a new project in a workspace' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a workspace member' })
  async create(ctx: RequestContext) {
    const result = await this.createProjectUseCase.execute(ctx.params.workspaceId, ctx.body)
    return reply.created(successResponse(result, 'Project created'))
  }

  @Get('/workspaces/:workspaceId/projects', { params: z.object({ workspaceId: z.string() }) })
  @Middleware(workspaceMembershipGuard)
  @ApiOperation({ summary: 'List all projects in a workspace' })
  @ApiResponse({ status: 200, description: 'List of projects returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a workspace member' })
  @ApiQueryParams(PROJECT_QUERY_CONFIG)
  async list(ctx: RequestContext) {
    return ctx.paginate(
      (parsed) =>
        this.projectRepo.findPaginated(parsed, {
          workspaceId: ctx.params.workspaceId,
          isArchived: false,
        }),
      PROJECT_QUERY_CONFIG,
    )
  }

  @Get('/projects/:projectId', { params: z.object({ projectId: z.string() }) })
  @Middleware(projectAccessGuard)
  @ApiOperation({ summary: 'Get a single project by ID' })
  @ApiResponse({ status: 200, description: 'Project returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to project' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getOne(ctx: RequestContext) {
    const project = ctx.get('project')
    return successResponse(project)
  }

  @Patch('/projects/:projectId', {
    params: z.object({ projectId: z.string() }),
    body: updateProjectSchema,
  })
  @Middleware(projectAccessGuard)
  @ApiOperation({ summary: 'Update a project' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to project' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async update(ctx: RequestContext) {
    const result = await this.updateProjectUseCase.execute(ctx.params.projectId, ctx.body)
    return successResponse(result)
  }

  @Delete('/projects/:projectId', { params: z.object({ projectId: z.string() }) })
  @Middleware(projectAccessGuard)
  @ApiOperation({ summary: 'Archive a project' })
  @ApiResponse({ status: 200, description: 'Project archived successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to project' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async delete(ctx: RequestContext) {
    await this.updateProjectUseCase.execute(ctx.params.projectId, { isArchived: true } as any)
    return successResponse(null, 'Project archived')
  }

  @Get('/projects/:projectId/board', { params: z.object({ projectId: z.string() }) })
  @Middleware(projectAccessGuard)
  @ApiOperation({ summary: 'Get the board view for a project' })
  @ApiResponse({ status: 200, description: 'Board view returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to project' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async board(ctx: RequestContext) {
    const result = await this.getBoardViewUseCase.execute(ctx.params.projectId)
    return successResponse(result)
  }
}
