import {
  Controller,
  Get,
  Post,
  Autowired,
  HttpException,
  reply,
  type RequestContext,
} from '@forinda/kickjs'
import { WorkspacesRepository } from './workspaces.repository'

@Controller()
export class WorkspacesController {
  @Autowired() private readonly workspaces!: WorkspacesRepository

  @Get('/')
  async list(_ctx: RequestContext) {
    const rows = await this.workspaces.list()
    return { workspaces: rows }
  }

  @Get('/:id')
  async show(ctx: RequestContext) {
    const ws = await this.workspaces.findById(ctx.params.id as string)
    if (!ws) throw HttpException.notFound()
    return ws
  }

  // Relational fetch — workspace + owner + members + projects in a
  // single round trip. Threads `ctx.signal` through to the DB layer
  // so the query cancels via `RelationalQueryCancelledError` when
  // the client disconnects mid-flight (M5.A.2 demonstrability for
  // the M5 exit gate).
  @Get('/:id/full')
  async showFull(ctx: RequestContext) {
    const ws = await this.workspaces.findFullById(ctx.params.id as string, ctx.signal)
    if (!ws) throw HttpException.notFound()
    return ws
  }

  // Per-owner listing. Same signal-threading pattern — the nested
  // members + projects aggregation is the heaviest of the three
  // example call sites, so being able to cancel matters most here.
  @Get('/owned-by/:userId')
  async ownedBy(ctx: RequestContext) {
    const rows = await this.workspaces.listOwnedByUser(ctx.params.userId as string, ctx.signal)
    return { workspaces: rows }
  }

  @Post('/')
  async create(ctx: RequestContext) {
    const body = ctx.body as {
      name: string
      slug: string
      description?: string | null
      ownerId: string
    }
    const created = await this.workspaces.create(body)
    return reply.created(created)
  }
}
