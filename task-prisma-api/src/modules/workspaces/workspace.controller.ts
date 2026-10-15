import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Autowired,
  Inject,
  Middleware,
  reply,
  HttpException,
} from '@forinda/kickjs'
import type { RequestContext } from '@forinda/kickjs'
import { ApiTags, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { authBridgeMiddleware } from '@/middleware/auth-bridge.middleware'
import { getUser } from '@/shared/auth'
import { successResponse } from '@/shared/api-response'
import { WorkspaceService } from './workspace.service'
import { WORKSPACE_REPOSITORY, type WorkspaceRepository } from './workspace.repository'
import {
  WORKSPACE_MEMBER_REPOSITORY,
  type WorkspaceMemberRepository,
} from './workspace-member.repository'
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from './workspace.dto'

@Controller()
@Middleware(authBridgeMiddleware)
@ApiBearerAuth()
export class WorkspaceController {
  @Autowired() private workspaceService!: WorkspaceService
  @Inject(WORKSPACE_REPOSITORY) private readonly repo!: WorkspaceRepository
  @Inject(WORKSPACE_MEMBER_REPOSITORY) private readonly memberRepo!: WorkspaceMemberRepository

  @Post('/', { body: createWorkspaceSchema, name: 'CreateWorkspace' })
  @ApiTags('Workspace')
  async create(ctx: RequestContext) {
    const user = getUser(ctx)
    const result = await this.workspaceService.create(ctx.body, user.id)
    return reply.created(successResponse(result))
  }

  @Get('/')
  @ApiTags('Workspace')
  async list(ctx: RequestContext) {
    const user = getUser(ctx)
    const workspaces = await this.repo.findForUser(user.id)
    return successResponse(workspaces)
  }

  @Get('/:id')
  @ApiTags('Workspace')
  async getById(ctx: RequestContext) {
    const result = await this.repo.findById(ctx.params.id)
    if (!result) throw HttpException.notFound('Workspace not found')
    return successResponse(result)
  }

  @Put('/:id', { body: updateWorkspaceSchema, name: 'UpdateWorkspace' })
  @ApiTags('Workspace')
  async update(ctx: RequestContext) {
    const result = await this.repo.update(ctx.params.id, ctx.body)
    return successResponse(result)
  }

  @Delete('/:id')
  @ApiTags('Workspace')
  async remove(ctx: RequestContext) {
    await this.repo.delete(ctx.params.id)
    return reply.noContent()
  }

  // --- Member management ---

  @Get('/:id/members')
  @ApiTags('Workspace')
  async listMembers(ctx: RequestContext) {
    const members = await this.memberRepo.listByWorkspace(ctx.params.id)
    return successResponse(members)
  }

  @Post('/:id/members', { body: inviteMemberSchema, name: 'InviteMember' })
  @ApiTags('Workspace')
  async inviteMember(ctx: RequestContext) {
    const result = await this.workspaceService.inviteMember(ctx.params.id, ctx.body)
    return reply.created(successResponse(result))
  }

  @Put('/:id/members/:userId', {
    body: updateMemberRoleSchema,
    name: 'UpdateMemberRole',
  })
  @ApiTags('Workspace')
  async updateMemberRole(ctx: RequestContext) {
    const result = await this.workspaceService.updateMemberRole(
      ctx.params.id,
      ctx.params.userId,
      ctx.body.role,
    )
    return successResponse(result)
  }

  @Delete('/:id/members/:userId')
  @ApiTags('Workspace')
  async removeMember(ctx: RequestContext) {
    await this.workspaceService.removeMember(ctx.params.id, ctx.params.userId)
    return reply.noContent()
  }

  @Post('/:id/leave')
  @ApiTags('Workspace')
  async leave(ctx: RequestContext) {
    const user = getUser(ctx)
    await this.workspaceService.removeMember(ctx.params.id, user.id)
    return successResponse(null, 'Left workspace')
  }
}
