import {
  Inject,
  Controller,
  Get,
  Patch,
  Delete,
  Middleware,
  type RequestContext,
  HttpException,
} from '@forinda/kickjs'
import { z } from 'zod'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { ErrorCode } from '@/shared/error-codes'
import { successResponse } from '@/shared/api-response'
import { channelMembershipGuard, findChannelForMember } from '@/guards/channel-membership.guard'
import { requireOwnerOrAdmin } from '@/guards/workspace-membership.guard'
import { getUser } from '@/auth'
import { MESSAGE_REPOSITORY, type MessageRepository } from './message.repository'

@ApiTags('Messages')
@ApiBearerAuth()
@Controller()
export class MessagesController {
  @Inject(MESSAGE_REPOSITORY) private messageRepo!: MessageRepository

  /** The message's sender or a workspace admin, among those who can see its channel. */
  private async requireAuthor(ctx: RequestContext) {
    const user = getUser(ctx)
    const message = await this.messageRepo.findById(ctx.params.messageId)
    const access = message && (await findChannelForMember(user.id, message.channelId.toString()))
    if (!message || !access) throw HttpException.notFound(ErrorCode.MESSAGE_NOT_FOUND)
    requireOwnerOrAdmin(access.member, message.senderId, user.id, ErrorCode.NOT_MESSAGE_AUTHOR)
  }

  @ApiOperation({ summary: 'Get message history for a channel' })
  @ApiResponse({ status: 200, description: 'Paginated message history returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('/channels/:channelId/messages', {
    params: z.object({ channelId: z.string() }),
    query: z.object({
      before: z.string().optional(),
      after: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
  })
  @Middleware(channelMembershipGuard)
  async history(ctx: RequestContext) {
    const messages = await this.messageRepo.findByChannel(ctx.params.channelId, ctx.query)
    return successResponse(messages)
  }

  @ApiOperation({ summary: 'Edit a message' })
  @ApiResponse({ status: 200, description: 'Message updated successfully' })
  @ApiResponse({ status: 403, description: 'Not the message author' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @Patch('/messages/:messageId', {
    params: z.object({ messageId: z.string() }),
    body: z.object({ content: z.string().min(1) }),
  })
  async edit(ctx: RequestContext) {
    await this.requireAuthor(ctx)
    const updated = await this.messageRepo.update(ctx.params.messageId, {
      content: ctx.body.content,
    })
    return successResponse(updated)
  }

  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not the message author' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @Delete('/messages/:messageId', { params: z.object({ messageId: z.string() }) })
  async delete(ctx: RequestContext) {
    await this.requireAuthor(ctx)
    await this.messageRepo.softDelete(ctx.params.messageId)
    return successResponse(null, 'Message deleted')
  }
}
