import { Controller, Get, Inject, Post, reply, type Ctx } from '@forinda/kickjs'
import { z } from 'zod'
import { fromZod } from '@forinda/kickjs-schema/zod'
import { LoadAuthUser } from '@/contributors/auth-user.contributor'
import { LoadTenant } from '@/contributors/tenant.contributor'
import { PROJECT_REPOSITORY, type ProjectRepository } from './project.repository'

const projectInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullish(),
})

export const createProjectSchema = fromZod(projectInput)

export const importProjectsSchema = fromZod(
  z.object({ projects: z.array(projectInput).min(1).max(500) }),
)

@Controller()
@LoadTenant // every query below runs as this tenant
// The app's default policy is 'open'; this controller requires a user.
@LoadAuthUser({ on401: 'reject' })
export class ProjectController {
  @Inject(PROJECT_REPOSITORY) private readonly projects!: ProjectRepository

  @Get('/')
  async list(ctx: Ctx<KickRoutes.ProjectController['list']>) {
    return { tenant: ctx.get('tenant')?.name, projects: await this.projects.list() }
  }

  @Post('/', { body: createProjectSchema })
  async create(ctx: Ctx<KickRoutes.ProjectController['create']>) {
    return reply.created(await this.projects.create(ctx.body))
  }

  /** Safe to retry: titles the workspace already has are left as they are. */
  @Post('/import', { body: importProjectsSchema })
  async import(ctx: Ctx<KickRoutes.ProjectController['import']>) {
    return { projects: await this.projects.importMany(ctx.body.projects) }
  }
}
