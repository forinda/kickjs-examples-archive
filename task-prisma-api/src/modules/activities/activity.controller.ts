import {
  Controller,
  Get,
  Inject,
  Middleware,
  ApiQueryParams,
  HttpException,
} from '@forinda/kickjs'
import type { RequestContext } from '@forinda/kickjs'
import { ApiTags, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { authBridgeMiddleware } from '@/middleware/auth-bridge.middleware'
import { ACTIVITY_REPOSITORY, type ActivityRepository } from './activity.repository'
import { ACTIVITY_QUERY_CONFIG } from './activity.constants'

@Controller()
@Middleware(authBridgeMiddleware)
@ApiBearerAuth()
export class ActivityController {
  @Inject(ACTIVITY_REPOSITORY) private readonly repo!: ActivityRepository

  @Get('/')
  @ApiTags('Activity')
  @ApiQueryParams(ACTIVITY_QUERY_CONFIG)
  async list(ctx: RequestContext) {
    const workspaceId = ctx.query.workspaceId as string
    if (!workspaceId) {
      throw HttpException.badRequest('workspaceId query parameter is required')
    }

    return ctx.paginate(
      (parsed) =>
        this.repo.findPaginated(parsed, {
          workspaceId,
          projectId: ctx.query.projectId as string | undefined,
          taskId: ctx.query.taskId as string | undefined,
        }),
      ACTIVITY_QUERY_CONFIG,
    )
  }
}
