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
    const user = getUser(ctx)
    const result = await this.messageService.create(ctx.body, user.id)
    return reply.created(successResponse(result))
  }

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
    const result = await this.repo.update(ctx.params.id, { content: ctx.body.content })
    return successResponse(result)
  }

  @Delete('/:id')
  @ApiTags('Message')
  async remove(ctx: RequestContext) {
    await this.repo.delete(ctx.params.id)
    return reply.noContent()
  }
}
