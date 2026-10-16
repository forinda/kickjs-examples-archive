import {
  HttpException,
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
import { channelMembershipGuard, requireChannelMember } from '@/guards/channel-membership.guard'
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
    await requireChannelMember(ctx, ctx.body.channelId)
    const user = getUser(ctx)
    const result = await this.messageService.create(ctx.body, user.id)
    return reply.created(successResponse(result))
  }

  @Middleware(channelMembershipGuard)
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

  @Put('/:id', { body: updateMessageSchema, name: 'UpdateMessage' })
  @ApiTags('Message')
  async update(ctx: RequestContext) {
    const message = await this.repo.findById(ctx.params.id)
    await requireChannelMember(ctx, message?.channelId, 'Message not found')
    if (message?.senderId !== getUser(ctx).id) {
      throw HttpException.forbidden(ErrorCode.NOT_MESSAGE_AUTHOR)
    }
    const result = await this.repo.update(ctx.params.id, { content: ctx.body.content })
    return successResponse(result)
  }

  @Delete('/:id')
  @ApiTags('Message')
  async remove(ctx: RequestContext) {
    const message = await this.repo.findById(ctx.params.id)
    await requireChannelMember(ctx, message?.channelId, 'Message not found')
    if (message?.senderId !== getUser(ctx).id) {
      throw HttpException.forbidden(ErrorCode.NOT_MESSAGE_AUTHOR)
    }
    await this.repo.delete(ctx.params.id)
    return reply.noContent()
  }
}
