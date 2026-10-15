import { Controller, Get, Autowired } from '@forinda/kickjs'
import type { RequestContext } from '@forinda/kickjs'
import { LoadAuthUser } from '../../auth'
import { TenantDbService } from '../../db/tenant-db.service'

@Controller()
// The app's default policy is 'open'; this controller opts in to requiring a user.
@LoadAuthUser({ on401: 'reject' })
export class ProjectController {
  @Autowired() private readonly tenantDb!: TenantDbService

  @Get('/')
  async list(ctx: RequestContext) {
    const db = await this.tenantDb.current()
    const result = db.query('projects')
    return {
      tenant: ctx.get('tenant')?.name,
      user: ctx.get('user')?.email,
      projects: result.rows,
    }
  }
}
