import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Autowired,
  Inject,
  Middleware,
  ApiQueryParams,
  reply,
  HttpException,
} from '@forinda/kickjs'
import type { RequestContext } from '@forinda/kickjs'
import { ApiTags, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { authBridgeMiddleware } from '@/middleware/auth-bridge.middleware'
import { ErrorCode } from '@/shared/error-codes'
import { access, requireAccess, requiredQuery } from '@/guards/resource-access.guard'
import { getUser } from '@/shared/auth'
import { successResponse } from '@/shared/api-response'
import { COMMENT_REPOSITORY, type CommentRepository } from './comment.repository'
import { CommentService } from './comment.service'
import { createCommentSchema, updateCommentSchema } from './comment.dto'
import { COMMENT_QUERY_CONFIG } from './comment.constants'

@Controller()
@Middleware(authBridgeMiddleware)
@ApiBearerAuth()
export class CommentController {
  @Autowired() private commentService!: CommentService
  @Inject(COMMENT_REPOSITORY) private readonly repo!: CommentRepository

  @Post('/', { body: createCommentSchema, name: 'CreateComment' })
  @ApiTags('Comment')
  async create(ctx: RequestContext) {
    await requireAccess(ctx, 'task', ctx.body.taskId)
    const user = getUser(ctx)
    const result = await this.commentService.create(ctx.body, user.id)
    return reply.created(successResponse(result))
  }

  @Get('/')
  @ApiTags('Comment')
  @ApiQueryParams(COMMENT_QUERY_CONFIG)
  async list(ctx: RequestContext) {
    const taskId = requiredQuery(ctx, 'taskId')
    await requireAccess(ctx, 'task', taskId)
    return ctx.paginate((parsed) => this.repo.findPaginated(parsed, taskId), COMMENT_QUERY_CONFIG)
  }

  @Middleware(access('comment'))
  @Get('/:id')
  @ApiTags('Comment')
  async getById(ctx: RequestContext) {
    const result = await this.repo.findById(ctx.params.id)
    if (!result) throw HttpException.notFound('Comment not found')
    return successResponse(result)
  }

  @Middleware(access('comment'))
  @Put('/:id', { body: updateCommentSchema, name: 'UpdateComment' })
  @ApiTags('Comment')
  async update(ctx: RequestContext) {
    const comment = await this.repo.findById(ctx.params.id)
    if (comment?.authorId !== getUser(ctx).id) {
      throw HttpException.forbidden(ErrorCode.NOT_COMMENT_AUTHOR)
    }
    const result = await this.commentService.update(ctx.params.id, ctx.body)
    return successResponse(result)
  }

  @Middleware(access('comment'))
  @Delete('/:id')
  @ApiTags('Comment')
  async remove(ctx: RequestContext) {
    const comment = await this.repo.findById(ctx.params.id)
    if (comment?.authorId !== getUser(ctx).id) {
      throw HttpException.forbidden(ErrorCode.NOT_COMMENT_AUTHOR)
    }
    await this.commentService.delete(ctx.params.id)
    return reply.noContent()
  }
}
