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
import { workspaceMembershipGuard } from '@/guards/workspace-membership.guard'
import { channelMembershipGuard } from '@/guards/channel-membership.guard'
import { CHANNEL_QUERY_CONFIG } from '@/shared/query-configs'
import { getUser } from '@/auth'
import {
  CHANNEL_REPOSITORY,
  type ChannelRepository,
} from './channel.repository'

@ApiTags('Channels')
@ApiBearerAuth()
@Controller()
export class ChannelsController {
  @Inject(CHANNEL_REPOSITORY) private channelRepo!: ChannelRepository

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
    return ctx.paginate(
      (parsed) => this.channelRepo.findPaginated(parsed, { workspaceId: ctx.params.workspaceId }),
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
    await this.channelRepo.removeMember(ctx.params.channelId, ctx.params.userId)
    return successResponse(null, 'Member removed')
  }
}
