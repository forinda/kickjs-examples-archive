import { Controller, Inject, Get, Middleware, type RequestContext } from '@forinda/kickjs'
import { ApiTags, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { authBridgeMiddleware } from '@/middleware/auth-bridge.middleware'
import { access } from '@/guards/resource-access.guard'
import { workspaceMembershipGuard } from '@/guards/workspace-membership.guard'
import { successResponse } from '@/shared/api-response'
import { STATS_REPOSITORY, type StatsRepository } from './stat.repository'

@Controller()
@Middleware(authBridgeMiddleware)
@ApiBearerAuth()
export class StatController {
  @Inject(STATS_REPOSITORY) private readonly repo!: StatsRepository

  @Middleware(workspaceMembershipGuard)
  @Get('/workspace/:workspaceId')
  @ApiTags('Stats')
  async workspaceStats(ctx: RequestContext) {
    const stats = await this.repo.getWorkspaceStats(ctx.params.workspaceId)
    return successResponse(stats)
  }

  @Middleware(access('project', 'projectId'))
  @Get('/project/:projectId')
  @ApiTags('Stats')
  async projectStats(ctx: RequestContext) {
    const stats = await this.repo.getProjectStats(ctx.params.projectId)
    return successResponse(stats)
  }

  @Middleware(workspaceMembershipGuard)
  @Get('/workspace/:workspaceId/stream')
  @ApiTags('Stats')
  async workspaceStatsStream(ctx: RequestContext) {
    const { workspaceId } = ctx.params
    const sse = ctx.sse()

    const sendStats = async () => {
      const stats = await this.repo.getWorkspaceStats(workspaceId)
      sse.send(stats, 'workspace:stats')
    }

    await sendStats()
    const interval = setInterval(sendStats, 10000)
    sse.onClose(() => clearInterval(interval))
  }

  @Middleware(access('project', 'projectId'))
  @Get('/project/:projectId/stream')
  @ApiTags('Stats')
  async projectStatsStream(ctx: RequestContext) {
    const { projectId } = ctx.params
    const sse = ctx.sse()

    const sendStats = async () => {
      const stats = await this.repo.getProjectStats(projectId)
      sse.send(stats, 'project:stats')
    }

    await sendStats()
    const interval = setInterval(sendStats, 10000)
    sse.onClose(() => clearInterval(interval))
  }
}
