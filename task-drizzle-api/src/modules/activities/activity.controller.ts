import {
  Controller,
  Inject,
  Get,
  Middleware,
  ApiQueryParams,
  HttpException,
  type RequestContext,
} from '@forinda/kickjs'
import { ApiTags, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { authBridgeMiddleware } from '@/middleware/auth-bridge.middleware'
import { requireWorkspaceMember } from '@/guards/workspace-membership.guard'
import { ACTIVITY_QUERY_CONFIG } from './activity.constants'
import { ACTIVITY_REPOSITORY, type ActivityRepository } from './activity.repository'

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
    await requireWorkspaceMember(ctx, workspaceId)

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
