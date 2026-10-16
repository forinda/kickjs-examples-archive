import {
  Controller,
  Get,
  Post,
  Inject,
  HttpException,
  reply,
  type RequestContext,
} from '@forinda/kickjs'
import { USER_REPOSITORY, type UserRepository } from './user.repository'

@Controller()
export class UserController {
  @Inject(USER_REPOSITORY) private readonly users!: UserRepository

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
