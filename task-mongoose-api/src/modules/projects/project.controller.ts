import {
  Inject,
  reply,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Middleware,
  Autowired,
  ApiQueryParams,
  type RequestContext,
} from '@forinda/kickjs'
import { z } from 'zod'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { createProjectSchema, updateProjectSchema } from './project.dto'
import { ProjectsService } from './project.service'
import { successResponse } from '@/shared/api-response'
import {
  requireOwnerOrAdmin,
  requireTargetMember,
  workspaceMembershipGuard,
} from '@/guards/workspace-membership.guard'
import { getUser } from '@/auth'
import { projectAccessGuard } from '@/guards/project-access.guard'
import { PROJECT_QUERY_CONFIG } from '@/shared/query-configs'
import { PROJECT_REPOSITORY, type ProjectRepository } from './project.repository'

@ApiTags('Projects')
@ApiBearerAuth()
@Controller()
export class ProjectsController {
  @Autowired() private projectsService!: ProjectsService
  @Inject(PROJECT_REPOSITORY) private projectRepo!: ProjectRepository

  /** Changing or archiving a project: a workspace admin or the project's lead (403). */
  private requireManager(ctx: RequestContext) {
    const project = ctx.get('project')!
    requireOwnerOrAdmin(ctx.get('workspaceMember')!, project.leadId, getUser(ctx).id)
    return project
  }

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
    if (ctx.body.leadId) await requireTargetMember(ctx.params.workspaceId, ctx.body.leadId)
    const result = await this.projectsService.create(ctx.params.workspaceId, ctx.body)
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
    const project = ctx.get('project')!
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
    const project = this.requireManager(ctx)
    if (ctx.body.leadId) await requireTargetMember(project.workspaceId.toString(), ctx.body.leadId)
    const result = await this.projectsService.update(ctx.params.projectId, ctx.body)
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
    this.requireManager(ctx)
    await this.projectsService.update(ctx.params.projectId, { isArchived: true } as any)
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
    const result = await this.projectsService.getBoardView(ctx.params.projectId)
    return successResponse(result)
  }
}
