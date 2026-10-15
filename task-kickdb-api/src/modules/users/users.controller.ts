import {
  Controller,
  Get,
  Post,
  Autowired,
  HttpException,
  reply,
  type RequestContext,
} from '@forinda/kickjs'
import { UsersRepository } from './users.repository'

@Controller()
export class UsersController {
  @Autowired() private readonly users!: UsersRepository

  @Get('/')
  async list(_ctx: RequestContext) {
    const rows = await this.users.list()
    return { users: rows }
  }

  @Get('/:id')
  async show(ctx: RequestContext) {
    const user = await this.users.findById(ctx.params.id as string)
    if (!user) throw HttpException.notFound()
    return user
  }

  @Post('/')
  async create(ctx: RequestContext) {
    const body = ctx.body as {
      email: string
      passwordHash: string
      firstName: string
      lastName: string
      avatarUrl?: string | null
    }
    const created = await this.users.create(body)
    return reply.created(created)
  }
}
