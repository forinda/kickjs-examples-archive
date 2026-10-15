import {
  Controller,
  Inject,
  Get,
  Post,
  Put,
  Delete,
  Autowired,
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
import { COMMENT_QUERY_CONFIG } from './comment.constants'
import { createCommentSchema, updateCommentSchema } from './comment.dto'
import { COMMENT_REPOSITORY, type CommentRepository } from './comment.repository'
import { CommentService } from './comment.service'

@Controller()
@Middleware(authBridgeMiddleware)
@ApiBearerAuth()
export class CommentController {
  @Autowired() private commentService!: CommentService
  @Inject(COMMENT_REPOSITORY) private readonly repo!: CommentRepository

  @Post('/', { body: createCommentSchema, name: 'CreateComment' })
  @ApiTags('Comment')
  async create(ctx: RequestContext) {
    const user = getUser(ctx)
    const result = await this.commentService.create(ctx.body, user.id)
    return reply.created(successResponse(result))
  }

  @Get('/')
  @ApiTags('Comment')
  @ApiQueryParams(COMMENT_QUERY_CONFIG)
  async list(ctx: RequestContext) {
    return ctx.paginate(
      (parsed) => this.repo.findPaginated(parsed, ctx.query.taskId as string | undefined),
      COMMENT_QUERY_CONFIG,
    )
  }

  @Get('/:id')
  @ApiTags('Comment')
  async getById(ctx: RequestContext) {
    const result = await this.repo.findById(ctx.params.id)
    if (!result) throw HttpException.notFound('Comment not found')
    return successResponse(result)
  }

  @Put('/:id', { body: updateCommentSchema, name: 'UpdateComment' })
  @ApiTags('Comment')
  async update(ctx: RequestContext) {
    const result = await this.commentService.update(ctx.params.id, ctx.body)
    return successResponse(result)
  }

  @Delete('/:id')
  @ApiTags('Comment')
  async remove(ctx: RequestContext) {
    await this.commentService.delete(ctx.params.id)
    return reply.noContent()
  }
}
