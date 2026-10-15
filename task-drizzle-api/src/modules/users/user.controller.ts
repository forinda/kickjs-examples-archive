import {
  Controller,
  Get,
  Put,
  Delete,
  Inject,
  Middleware,
  ApiQueryParams,
  reply,
  HttpException,
  type RequestContext,
} from '@forinda/kickjs'
import { ApiTags, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { authBridgeMiddleware } from '@/middleware/auth-bridge.middleware'
import { getUser } from '@/shared/auth'
import { successResponse } from '@/shared/api-response'
import { USER_REPOSITORY, type UserRepository } from './user.repository'
import { updateUserSchema } from './user.dto'
import { USER_QUERY_CONFIG } from './user.constants'

@Controller()
@Middleware(authBridgeMiddleware)
@ApiBearerAuth()
export class UserController {
  @Inject(USER_REPOSITORY) private readonly repo!: UserRepository

  @Get('/me')
  @ApiTags('User')
  async me(ctx: RequestContext) {
    const authUser = getUser(ctx)
    const user = await this.repo.findById(authUser.id)
    return successResponse(user)
  }

  @Put('/me', { body: updateUserSchema, name: 'UpdateProfile' })
  @ApiTags('User')
  async updateProfile(ctx: RequestContext) {
    const authUser = getUser(ctx)
    const result = await this.repo.update(authUser.id, ctx.body)
    return successResponse(result)
  }

  @Get('/')
  @ApiTags('User')
  @ApiQueryParams(USER_QUERY_CONFIG)
  async list(ctx: RequestContext) {
    return ctx.paginate((parsed) => this.repo.findPaginated(parsed), USER_QUERY_CONFIG)
  }

  @Get('/:id')
  @ApiTags('User')
  async getById(ctx: RequestContext) {
    const result = await this.repo.findById(ctx.params.id)
    if (!result) throw HttpException.notFound('User not found')
    return successResponse(result)
  }

  @Delete('/:id')
  @ApiTags('User')
  async remove(ctx: RequestContext) {
    await this.repo.delete(ctx.params.id)
    return reply.noContent()
  }
}
