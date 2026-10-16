import {
  Inject,
  reply,
  Controller,
  Get,
  Post,
  Delete,
  Middleware,
  ApiQueryParams,
  type RequestContext,
  HttpException,
} from '@forinda/kickjs'
import { z } from 'zod'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { ErrorCode } from '@/shared/error-codes'
import { createChannelSchema } from './channel.dto'
import { successResponse } from '@/shared/api-response'
import {
  requireOwnerOrAdmin,
  requireTargetMember,
  workspaceMembershipGuard,
} from '@/guards/workspace-membership.guard'
import { channelMembershipGuard } from '@/guards/channel-membership.guard'
import { CHANNEL_QUERY_CONFIG, paginate } from '@/shared/query-configs'
import { getUser } from '@/auth'
import { CHANNEL_REPOSITORY, type ChannelRepository } from './channel.repository'
import { PROJECT_REPOSITORY, type ProjectRepository } from '@/modules/projects/project.repository'

@ApiTags('Channels')
@ApiBearerAuth()
@Controller()
export class ChannelsController {
  @Inject(CHANNEL_REPOSITORY) private channelRepo!: ChannelRepository
  @Inject(PROJECT_REPOSITORY) private projectRepo!: ProjectRepository

  /** Deleting a channel or removing others: its creator or a workspace admin (403). */
  private requireManager(ctx: RequestContext) {
    requireOwnerOrAdmin(
      ctx.get('workspaceMember')!,
      ctx.get('channel')!.createdById,
      getUser(ctx).id,
    )
  }

  @ApiOperation({ summary: 'Create a channel in a workspace' })
  @ApiResponse({ status: 201, description: 'Channel created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Channel name already exists' })
  @Post('/workspaces/:workspaceId/channels', {
    params: z.object({ workspaceId: z.string() }),
    body: createChannelSchema,
  })
  @Middleware(workspaceMembershipGuard)
  async create(ctx: RequestContext) {
    const user = getUser(ctx)
    const existing = await this.channelRepo.findByNameAndWorkspace(
      ctx.body.name,
      ctx.params.workspaceId,
    )
    if (existing) throw HttpException.conflict(ErrorCode.CHANNEL_NAME_EXISTS)
    if (ctx.body.projectId) {
      const project = await this.projectRepo.findById(ctx.body.projectId)
      if (project?.workspaceId.toString() !== ctx.params.workspaceId) {
        throw HttpException.notFound(ErrorCode.PROJECT_NOT_FOUND)
      }
    }
    const channel = await this.channelRepo.create({
      ...ctx.body,
      workspaceId: ctx.params.workspaceId as any,
      createdById: user.id as any,
      memberIds: [user.id as any],
      projectId: ctx.body.projectId as any,
    })
    return reply.created(successResponse(channel))
  }

  @ApiOperation({ summary: 'List channels in a workspace' })
  @ApiResponse({ status: 200, description: 'List of channels returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('/workspaces/:workspaceId/channels', { params: z.object({ workspaceId: z.string() }) })
  @Middleware(workspaceMembershipGuard)
  @ApiQueryParams(CHANNEL_QUERY_CONFIG)
  async list(ctx: RequestContext) {
    return paginate(
      ctx,
      (parsed) =>
        this.channelRepo.findPaginated(parsed, {
          workspaceId: ctx.params.workspaceId,
          // Private and direct channels only for their members.
          $and: [{ $or: [{ type: 'public' }, { memberIds: getUser(ctx).id }] }],
        }),
      CHANNEL_QUERY_CONFIG,
    )
  }

  @ApiOperation({ summary: 'Get a single channel by ID' })
  @ApiResponse({ status: 200, description: 'Channel details returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('/channels/:channelId', { params: z.object({ channelId: z.string() }) })
  @Middleware(channelMembershipGuard)
  async getOne(ctx: RequestContext) {
    const channel = ctx.get('channel')
    return successResponse(channel)
  }

  @ApiOperation({ summary: 'Delete a channel' })
  @ApiResponse({ status: 200, description: 'Channel deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Delete('/channels/:channelId', { params: z.object({ channelId: z.string() }) })
  @Middleware(channelMembershipGuard)
  async delete(ctx: RequestContext) {
    this.requireManager(ctx)
    await this.channelRepo.delete(ctx.params.channelId)
    return successResponse(null, 'Channel deleted')
  }

  @ApiOperation({ summary: 'Add a member to a channel' })
  @ApiResponse({ status: 200, description: 'Member added successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('/channels/:channelId/members', {
    params: z.object({ channelId: z.string() }),
    body: z.object({ userId: z.string() }),
  })
  @Middleware(channelMembershipGuard)
  async addMember(ctx: RequestContext) {
    // Anyone who can see the channel may add a teammate — from the same workspace only.
    await requireTargetMember(ctx.get('channel')!.workspaceId.toString(), ctx.body.userId)
    await this.channelRepo.addMember(ctx.params.channelId, ctx.body.userId)
    return successResponse(null, 'Member added')
  }

  @ApiOperation({ summary: 'Remove a member from a channel' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Delete('/channels/:channelId/members/:userId', {
    params: z.object({ channelId: z.string(), userId: z.string() }),
  })
  @Middleware(channelMembershipGuard)
  async removeMember(ctx: RequestContext) {
    // Leaving is always allowed; removing someone else is for the creator or an admin.
    if (ctx.params.userId !== getUser(ctx).id) this.requireManager(ctx)
    await this.channelRepo.removeMember(ctx.params.channelId, ctx.params.userId)
    return successResponse(null, 'Member removed')
  }
}
