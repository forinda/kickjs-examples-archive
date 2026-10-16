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
import { ErrorCode } from '@/shared/error-codes'
import { access, requireAccess, requiredQuery } from '@/guards/resource-access.guard'
import { requireOwnerOrAdmin } from '@/guards/workspace-membership.guard'
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

  /** The comment's author or a workspace admin, among members of its workspace. */
  private async requireAuthor(ctx: RequestContext) {
    const member = await requireAccess(ctx, 'comment', ctx.params.id)
    const comment = await this.repo.findById(ctx.params.id)
    requireOwnerOrAdmin(ctx, member, comment?.authorId, ErrorCode.NOT_COMMENT_AUTHOR)
  }

  @Put('/:id', { body: updateCommentSchema, name: 'UpdateComment' })
  @ApiTags('Comment')
  async update(ctx: RequestContext) {
    await this.requireAuthor(ctx)
    const result = await this.commentService.update(ctx.params.id, ctx.body)
    return successResponse(result)
  }

  @Delete('/:id')
  @ApiTags('Comment')
  async remove(ctx: RequestContext) {
    await this.requireAuthor(ctx)
    await this.commentService.delete(ctx.params.id)
    return reply.noContent()
  }
}
