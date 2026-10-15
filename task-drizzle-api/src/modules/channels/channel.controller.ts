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
import { getUser } from '@/shared/auth'
import { successResponse } from '@/shared/api-response'
import { CHANNEL_QUERY_CONFIG } from './channel.constants'
import { createChannelSchema, updateChannelSchema } from './channel.dto'
import { CHANNEL_REPOSITORY, type ChannelRepository } from './channel.repository'
import { CHANNEL_MEMBER_REPOSITORY, type ChannelMemberRepository } from './channel-member.repository'
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

    return ctx.paginate(
      (parsed) => this.repo.findPaginated(parsed, workspaceId),
      CHANNEL_QUERY_CONFIG,
    )
  }

  @Get('/:id')
  @ApiTags('Channel')
  async getById(ctx: RequestContext) {
    const result = await this.repo.findById(ctx.params.id)
    if (!result) throw HttpException.notFound('Channel not found')
    return successResponse(result)
  }

  @Put('/:id', { body: updateChannelSchema, name: 'UpdateChannel' })
  @ApiTags('Channel')
  async update(ctx: RequestContext) {
    const result = await this.repo.update(ctx.params.id, ctx.body)
    return successResponse(result)
  }

  @Delete('/:id')
  @ApiTags('Channel')
  async remove(ctx: RequestContext) {
    await this.repo.delete(ctx.params.id)
    return reply.noContent()
  }

  // --- Members ---

  @Get('/:id/members')
  @ApiTags('Channel')
  async listMembers(ctx: RequestContext) {
    const members = await this.memberRepo.listMembers(ctx.params.id)
    return successResponse(members)
  }

  @Post('/:id/members/:userId')
  @ApiTags('Channel')
  async addMember(ctx: RequestContext) {
    const result = await this.channelService.addMember(ctx.params.id, ctx.params.userId)
    return reply.created(successResponse(result))
  }

  @Delete('/:id/members/:userId')
  @ApiTags('Channel')
  async removeMember(ctx: RequestContext) {
    await this.memberRepo.removeMember(ctx.params.id, ctx.params.userId)
    return reply.noContent()
  }
}
