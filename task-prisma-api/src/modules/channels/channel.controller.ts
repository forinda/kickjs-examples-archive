import {
  Controller,
  Inject,
  Get,
  Post,
  Put,
  Delete,
  Autowired,
  Middleware,
  ApiQueryParams,
  reply,
  HttpException,
  type RequestContext,
} from '@forinda/kickjs'
import { ApiTags, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { authBridgeMiddleware } from '@/middleware/auth-bridge.middleware'
import { requireTargetMember, requireWorkspaceMember } from '@/guards/workspace-membership.guard'
import { workspaceIdOf } from '@/guards/resource-access.guard'
import {
  channelAccess,
  channelManager,
  requireChannelAccess,
  requireChannelManager,
} from '@/guards/channel-membership.guard'
import { getUser } from '@/shared/auth'
import { successResponse } from '@/shared/api-response'
import { paginate } from '@/shared/query-adapter'
import { CHANNEL_QUERY_CONFIG } from './channel.constants'
import { createChannelSchema, updateChannelSchema } from './channel.dto'
import { CHANNEL_REPOSITORY, type ChannelRepository } from './channel.repository'
import {
  CHANNEL_MEMBER_REPOSITORY,
  type ChannelMemberRepository,
} from './channel-member.repository'
import { ChannelService } from './channel.service'

@Controller()
@Middleware(authBridgeMiddleware)
@ApiBearerAuth()
export class ChannelController {
  @Autowired() private channelService!: ChannelService
  @Inject(CHANNEL_REPOSITORY) private readonly repo!: ChannelRepository
  @Inject(CHANNEL_MEMBER_REPOSITORY) private readonly memberRepo!: ChannelMemberRepository

  @Post('/', { body: createChannelSchema, name: 'CreateChannel' })
  @ApiTags('Channel')
  async create(ctx: RequestContext) {
    await requireWorkspaceMember(ctx, ctx.body.workspaceId)
    if (
      ctx.body.projectId &&
      (await workspaceIdOf('project', ctx.body.projectId)) !== ctx.body.workspaceId
    ) {
      throw HttpException.notFound('Project not found')
    }
    const user = getUser(ctx)
    const result = await this.channelService.create(ctx.body, user.id)
    return reply.created(successResponse(result))
  }

  @Get('/')
  @ApiTags('Channel')
  @ApiQueryParams(CHANNEL_QUERY_CONFIG)
  async list(ctx: RequestContext) {
    const workspaceId = ctx.query.workspaceId as string
    if (!workspaceId) {
      throw HttpException.badRequest('workspaceId query parameter is required')
    }
    await requireWorkspaceMember(ctx, workspaceId)

    return paginate(
      ctx,
      (parsed) => this.repo.findPaginated(parsed, workspaceId, getUser(ctx).id),
      CHANNEL_QUERY_CONFIG,
    )
  }

  @Middleware(channelAccess())
  @Get('/:id')
  @ApiTags('Channel')
  async getById(ctx: RequestContext) {
    const result = await this.repo.findById(ctx.params.id)
    if (!result) throw HttpException.notFound('Channel not found')
    return successResponse(result)
  }

  @Middleware(channelManager())
  @Put('/:id', { body: updateChannelSchema, name: 'UpdateChannel' })
  @ApiTags('Channel')
  async update(ctx: RequestContext) {
    const result = await this.repo.update(ctx.params.id, ctx.body)
    return successResponse(result)
  }

  @Middleware(channelManager())
  @Delete('/:id')
  @ApiTags('Channel')
  async remove(ctx: RequestContext) {
    await this.repo.delete(ctx.params.id)
    return reply.noContent()
  }

  // --- Members ---

  @Middleware(channelAccess())
  @Get('/:id/members')
  @ApiTags('Channel')
  async listMembers(ctx: RequestContext) {
    const members = await this.memberRepo.listMembers(ctx.params.id)
    return successResponse(members)
  }

  @Post('/:id/members/:userId')
  @ApiTags('Channel')
  async addMember(ctx: RequestContext) {
    // Anyone who can see the channel may add a teammate — from the same workspace only.
    const { channel } = await requireChannelAccess(ctx, ctx.params.id)
    await requireTargetMember(channel.workspaceId, ctx.params.userId)
    const result = await this.channelService.addMember(ctx.params.id, ctx.params.userId)
    return reply.created(successResponse(result))
  }

  @Delete('/:id/members/:userId')
  @ApiTags('Channel')
  async removeMember(ctx: RequestContext) {
    // Leaving is always allowed; removing someone else is for the creator or an admin.
    if (ctx.params.userId === getUser(ctx).id) await requireChannelAccess(ctx, ctx.params.id)
    else await requireChannelManager(ctx, ctx.params.id)
    await this.memberRepo.removeMember(ctx.params.id, ctx.params.userId)
    return reply.noContent()
  }
}
