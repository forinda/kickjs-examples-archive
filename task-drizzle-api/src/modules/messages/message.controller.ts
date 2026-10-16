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
  type RequestContext,
} from '@forinda/kickjs'
import { ApiTags, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { authBridgeMiddleware } from '@/middleware/auth-bridge.middleware'
import { ErrorCode } from '@/shared/error-codes'
import { channelAccess, requireChannelAccess } from '@/guards/channel-membership.guard'
import { requireOwnerOrAdmin } from '@/guards/workspace-membership.guard'
import { getUser } from '@/shared/auth'
import { successResponse } from '@/shared/api-response'
import { createMessageSchema, updateMessageSchema } from './message.dto'
import { MESSAGE_REPOSITORY, type MessageRepository } from './message.repository'
import { MessageService } from './message.service'

@Controller()
@Middleware(authBridgeMiddleware)
@ApiBearerAuth()
export class MessageController {
  @Autowired() private messageService!: MessageService
  @Inject(MESSAGE_REPOSITORY) private readonly repo!: MessageRepository

  @Post('/', { body: createMessageSchema, name: 'CreateMessage' })
  @ApiTags('Message')
  async create(ctx: RequestContext) {
    await requireChannelAccess(ctx, ctx.body.channelId)
    const user = getUser(ctx)
    const result = await this.messageService.create(ctx.body, user.id)
    return reply.created(successResponse(result))
  }

  @Middleware(channelAccess('channelId'))
  @Get('/channel/:channelId')
  @ApiTags('Message')
  async listByChannel(ctx: RequestContext) {
    const messages = await this.repo.findByChannel(
      ctx.params.channelId,
      ctx.query.cursor as string | undefined,
      ctx.query.limit ? Number(ctx.query.limit) : undefined,
    )
    return successResponse(messages)
  }

  /** The message's sender or a workspace admin, among those who can see its channel. */
  private async requireAuthor(ctx: RequestContext) {
    const message = await this.repo.findById(ctx.params.id)
    const { member } = await requireChannelAccess(ctx, message?.channelId, 'Message not found')
    requireOwnerOrAdmin(ctx, member, message?.senderId, ErrorCode.NOT_MESSAGE_AUTHOR)
  }

  @Put('/:id', { body: updateMessageSchema, name: 'UpdateMessage' })
  @ApiTags('Message')
  async update(ctx: RequestContext) {
    await this.requireAuthor(ctx)
    const result = await this.repo.update(ctx.params.id, { content: ctx.body.content })
    return successResponse(result)
  }

  @Delete('/:id')
  @ApiTags('Message')
  async remove(ctx: RequestContext) {
    await this.requireAuthor(ctx)
    await this.repo.delete(ctx.params.id)
    return reply.noContent()
  }
}
