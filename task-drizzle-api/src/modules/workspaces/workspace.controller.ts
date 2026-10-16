import {
  Controller,
  Inject,
  Get,
  Post,
  Put,
  Delete,
  Autowired,
  Middleware,
  reply,
  HttpException,
  type RequestContext,
} from '@forinda/kickjs'
import { ApiTags, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { authBridgeMiddleware } from '@/middleware/auth-bridge.middleware'
import {
  requireTargetMember,
  requireWorkspaceRole,
  workspaceMembershipGuard,
} from '@/guards/workspace-membership.guard'
import { getUser } from '@/shared/auth'
import { successResponse } from '@/shared/api-response'
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from './workspace.dto'
import { WORKSPACE_REPOSITORY, type WorkspaceRepository } from './workspace.repository'
import {
  WORKSPACE_MEMBER_REPOSITORY,
  type WorkspaceMemberRepository,
} from './workspace-member.repository'
import { WorkspaceService } from './workspace.service'

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

  // Before `/:id`, so `invites` isn't taken for a workspace id.
  @Get('/invites')
  @ApiTags('Workspace')
  async listInvites(ctx: RequestContext) {
    return successResponse(await this.memberRepo.listInvitesForUser(getUser(ctx).id))
  }

  // No membership guard: the invitee isn't a member yet. Both act on the caller's own invite only.
  @Post('/:id/invite/accept')
  @ApiTags('Workspace')
  async acceptInvite(ctx: RequestContext) {
    await this.workspaceService.acceptInvite(ctx.params.id, getUser(ctx).id)
    return successResponse(null, 'Invite accepted')
  }

  @Post('/:id/invite/decline')
  @ApiTags('Workspace')
  async declineInvite(ctx: RequestContext) {
    await this.workspaceService.declineInvite(ctx.params.id, getUser(ctx).id)
    return successResponse(null, 'Invite declined')
  }

  @Middleware(workspaceMembershipGuard)
  @Get('/:id')
  @ApiTags('Workspace')
  async getById(ctx: RequestContext) {
    const result = await this.repo.findById(ctx.params.id)
    if (!result) throw HttpException.notFound('Workspace not found')
    return successResponse(result)
  }

  @Middleware(requireWorkspaceRole('admin'))
  @Put('/:id', { body: updateWorkspaceSchema, name: 'UpdateWorkspace' })
  @ApiTags('Workspace')
  async update(ctx: RequestContext) {
    const result = await this.repo.update(ctx.params.id, ctx.body)
    return successResponse(result)
  }

  @Middleware(requireWorkspaceRole('admin'))
  @Delete('/:id')
  @ApiTags('Workspace')
  async remove(ctx: RequestContext) {
    await this.repo.delete(ctx.params.id)
    return reply.noContent()
  }

  // --- Member management ---

  @Middleware(workspaceMembershipGuard)
  @Get('/:id/members')
  @ApiTags('Workspace')
  async listMembers(ctx: RequestContext) {
    const members = await this.memberRepo.listByWorkspace(ctx.params.id)
    return successResponse(members)
  }

  @Middleware(requireWorkspaceRole('admin'))
  @Post('/:id/members', { body: inviteMemberSchema, name: 'InviteMember' })
  @ApiTags('Workspace')
  async inviteMember(ctx: RequestContext) {
    // Same answer whether or not the email has an account (no account enumeration).
    await this.workspaceService.inviteMember(ctx.params.id, ctx.body)
    return reply.accepted(successResponse(null, 'Invitation sent'))
  }

  @Middleware(requireWorkspaceRole('admin'))
  @Put('/:id/members/:userId', {
    body: updateMemberRoleSchema,
    name: 'UpdateMemberRole',
  })
  @ApiTags('Workspace')
  async updateMemberRole(ctx: RequestContext) {
    await requireTargetMember(ctx.params.id, ctx.params.userId)
    const result = await this.workspaceService.updateMemberRole(
      ctx.params.id,
      ctx.params.userId,
      ctx.body.role,
    )
    return successResponse(result)
  }

  @Middleware(requireWorkspaceRole('admin'))
  @Delete('/:id/members/:userId')
  @ApiTags('Workspace')
  async removeMember(ctx: RequestContext) {
    await requireTargetMember(ctx.params.id, ctx.params.userId)
    await this.workspaceService.removeMember(ctx.params.id, ctx.params.userId)
    return reply.noContent()
  }

  @Middleware(workspaceMembershipGuard)
  @Post('/:id/leave')
  @ApiTags('Workspace')
  async leave(ctx: RequestContext) {
    const user = getUser(ctx)
    await this.workspaceService.removeMember(ctx.params.id, user.id)
    return successResponse(null, 'Left workspace')
  }
}
