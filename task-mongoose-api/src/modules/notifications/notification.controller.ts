import {
  Inject,
  Controller,
  Get,
  Patch,
  Post,
  ApiQueryParams,
  type RequestContext,
} from '@forinda/kickjs'
import { z } from 'zod'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { NOTIFICATION_QUERY_CONFIG, paginate } from '@/shared/query-configs'
import { getUser } from '@/auth'

import { successResponse } from '@/shared/api-response'
import { NOTIFICATION_REPOSITORY, type NotificationRepository } from './notification.repository'

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller()
export class NotificationsController {
  @Inject(NOTIFICATION_REPOSITORY) private notificationRepo!: NotificationRepository

  @ApiOperation({ summary: 'List notifications for the current user' })
  @ApiResponse({ status: 200, description: 'Paginated list of notifications returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('/')
  @ApiQueryParams(NOTIFICATION_QUERY_CONFIG)
  async list(ctx: RequestContext) {
    const user = getUser(ctx)
    return paginate(
      ctx,
      (parsed) => this.notificationRepo.findByRecipient(user.id, parsed),
      NOTIFICATION_QUERY_CONFIG,
    )
  }

  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Patch('/:id/read', { params: z.object({ id: z.string() }) })
  async markRead(ctx: RequestContext) {
    await this.notificationRepo.markAsRead(ctx.params.id, getUser(ctx).id)
    return successResponse(null, 'Marked as read')
  }

  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('/read-all')
  async markAllRead(ctx: RequestContext) {
    const user = getUser(ctx)
    await this.notificationRepo.markAllAsRead(user.id)
    return successResponse(null, 'All marked as read')
  }

  @ApiOperation({ summary: 'Get the unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread notification count returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('/unread-count')
  async unreadCount(ctx: RequestContext) {
    const user = getUser(ctx)
    const count = await this.notificationRepo.countUnread(user.id)
    return successResponse({ count })
  }
}
