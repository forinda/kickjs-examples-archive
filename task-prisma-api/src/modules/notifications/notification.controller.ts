import { Controller, Get, Put, Inject, Middleware, ApiQueryParams, reply } from '@forinda/kickjs'
import type { RequestContext } from '@forinda/kickjs'
import { ApiTags, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { authBridgeMiddleware } from '@/middleware/auth-bridge.middleware'
import { getUser } from '@/shared/auth'
import { successResponse } from '@/shared/api-response'
import { NOTIFICATION_REPOSITORY, type NotificationRepository } from './notification.repository'
import { NOTIFICATION_QUERY_CONFIG } from './notification.constants'

@Controller()
@Middleware(authBridgeMiddleware)
@ApiBearerAuth()
export class NotificationController {
  @Inject(NOTIFICATION_REPOSITORY) private readonly repo!: NotificationRepository

  @Get('/')
  @ApiTags('Notification')
  @ApiQueryParams(NOTIFICATION_QUERY_CONFIG)
  async list(ctx: RequestContext) {
    const user = getUser(ctx)
    return ctx.paginate(
      (parsed) => this.repo.findPaginated(parsed, user.id),
      NOTIFICATION_QUERY_CONFIG,
    )
  }

  @Get('/unread-count')
  @ApiTags('Notification')
  async unreadCount(ctx: RequestContext) {
    const user = getUser(ctx)
    const count = await this.repo.unreadCount(user.id)
    return successResponse({ count })
  }

  @Put('/:id/read')
  @ApiTags('Notification')
  async markRead(ctx: RequestContext) {
    await this.repo.markRead(ctx.params.id, getUser(ctx).id)
    return reply.noContent()
  }

  @Put('/read-all')
  @ApiTags('Notification')
  async markAllRead(ctx: RequestContext) {
    const user = getUser(ctx)
    await this.repo.markAllRead(user.id)
    return reply.noContent()
  }
}
