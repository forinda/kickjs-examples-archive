import {
  Middleware,
  Inject,
  reply,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Autowired,
  ApiQueryParams,
  type RequestContext,
  HttpException,
} from '@forinda/kickjs'
import { findTaskForMember, taskAccessGuard } from '@/guards/task-access.guard'
import { z } from 'zod'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { ErrorCode } from '@/shared/error-codes'
import { createCommentSchema, updateCommentSchema } from './comment.dto'
import { CommentsService } from './comment.service'
import { successResponse } from '@/shared/api-response'
import { COMMENT_QUERY_CONFIG } from '@/shared/query-configs'
import { requireOwnerOrAdmin } from '@/guards/workspace-membership.guard'
import { getUser } from '@/auth'
import { COMMENT_REPOSITORY, type CommentRepository } from './comment.repository'
import { TASK_REPOSITORY, type TaskRepository } from '@/modules/tasks/task.repository'

@ApiTags('Comments')
@ApiBearerAuth()
@Controller()
export class CommentsController {
  @Autowired() private commentsService!: CommentsService
  @Inject(COMMENT_REPOSITORY) private commentRepo!: CommentRepository
  @Inject(TASK_REPOSITORY) private taskRepo!: TaskRepository

  /** The comment's author or a workspace admin, among members of its workspace. */
  private async requireAuthor(ctx: RequestContext) {
    const user = getUser(ctx)
    const comment = await this.commentRepo.findById(ctx.params.commentId)
    const access = comment && (await findTaskForMember(user.id, comment.taskId.toString()))
    if (!comment || !access) throw HttpException.notFound(ErrorCode.COMMENT_NOT_FOUND)
    requireOwnerOrAdmin(access.member, comment.authorId, user.id, ErrorCode.NOT_COMMENT_AUTHOR)
    return comment
  }

  @ApiOperation({ summary: 'Create a comment on a task' })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('/tasks/:taskId/comments', {
    params: z.object({ taskId: z.string() }),
    body: createCommentSchema,
  })
  @Middleware(taskAccessGuard)
  async create(ctx: RequestContext) {
    const user = getUser(ctx)
    // A reply only to a comment on the same task.
    if (ctx.body.parentCommentId) {
      const parent = await this.commentRepo.findById(ctx.body.parentCommentId)
      if (parent?.taskId.toString() !== ctx.params.taskId) {
        throw HttpException.notFound(ErrorCode.COMMENT_NOT_FOUND)
      }
    }
    const result = await this.commentsService.create(ctx.params.taskId, user.id, ctx.body)
    return reply.created(successResponse(result))
  }

  @ApiOperation({ summary: 'List comments for a task' })
  @ApiResponse({ status: 200, description: 'List of comments returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('/tasks/:taskId/comments', { params: z.object({ taskId: z.string() }) })
  @ApiQueryParams(COMMENT_QUERY_CONFIG)
  @Middleware(taskAccessGuard)
  async list(ctx: RequestContext) {
    return ctx.paginate(
      (parsed) => this.commentRepo.findPaginated(parsed, { taskId: ctx.params.taskId }),
      COMMENT_QUERY_CONFIG,
    )
  }

  @ApiOperation({ summary: 'Update a comment' })
  @ApiResponse({ status: 200, description: 'Comment updated successfully' })
  @ApiResponse({ status: 403, description: 'Not the comment author' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @Patch('/comments/:commentId', {
    params: z.object({ commentId: z.string() }),
    body: updateCommentSchema,
  })
  async update(ctx: RequestContext) {
    await this.requireAuthor(ctx)
    const updated = await this.commentRepo.update(ctx.params.commentId, { body: ctx.body.body })
    return successResponse(updated)
  }

  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not the comment author' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @Delete('/comments/:commentId', { params: z.object({ commentId: z.string() }) })
  async delete(ctx: RequestContext) {
    const comment = await this.requireAuthor(ctx)
    await this.commentRepo.delete(ctx.params.commentId)
    await this.taskRepo.incrementCommentCount(comment.taskId.toString(), -1)
    return successResponse(null, 'Comment deleted')
  }
}
