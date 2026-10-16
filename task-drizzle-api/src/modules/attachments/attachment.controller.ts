import {
  Controller,
  Inject,
  Get,
  Post,
  Delete,
  Autowired,
  Middleware,
  ApiQueryParams,
  FileUpload,
  reply,
  HttpException,
  type RequestContext,
} from '@forinda/kickjs'
import { ApiTags, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { authBridgeMiddleware } from '@/middleware/auth-bridge.middleware'
import { getUser } from '@/shared/auth'
import { successResponse } from '@/shared/api-response'
import { ATTACHMENT_QUERY_CONFIG } from './attachment.constants'
import { ATTACHMENT_REPOSITORY, type AttachmentRepository } from './attachment.repository'
import { AttachmentService } from './attachment.service'

@Controller()
@Middleware(authBridgeMiddleware)
@ApiBearerAuth()
export class AttachmentController {
  @Autowired() private attachmentService!: AttachmentService
  @Inject(ATTACHMENT_REPOSITORY) private readonly repo!: AttachmentRepository

  @Post('/')
  @ApiTags('Attachment')
  @FileUpload({
    mode: 'single',
    fieldName: 'file',
    maxSize: 10 * 1024 * 1024, // 10MB
  })
  async create(ctx: RequestContext) {
    const user = getUser(ctx)
    const file = ctx.file
    const taskId = ctx.body.taskId

    const result = await this.attachmentService.create(
      {
        taskId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        data: file.buffer.toString('base64'),
      },
      user.id,
    )
    return reply.created(successResponse(result))
  }

  @Get('/')
  @ApiTags('Attachment')
  @ApiQueryParams(ATTACHMENT_QUERY_CONFIG)
  async list(ctx: RequestContext) {
    return ctx.paginate(
      (parsed) => this.repo.findPaginated(parsed, ctx.query.taskId as string | undefined),
      ATTACHMENT_QUERY_CONFIG,
    )
  }

  @Get('/:id')
  @ApiTags('Attachment')
  async getById(ctx: RequestContext) {
    const result = await this.repo.findById(ctx.params.id)
    if (!result) throw HttpException.notFound('Attachment not found')
    return successResponse(result)
  }

  @Get('/:id/download')
  @ApiTags('Attachment')
  async download(ctx: RequestContext) {
    const result = await this.repo.findById(ctx.params.id)
    if (!result) throw HttpException.notFound('Attachment not found')

    const buffer = Buffer.from(result.data, 'base64')
    ctx.res.setHeader('Content-Type', result.mimeType)
    ctx.res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`)
    ctx.res.setHeader('Content-Length', buffer.length)
    ctx.res.end(buffer)
  }

  @Delete('/:id')
  @ApiTags('Attachment')
  async remove(ctx: RequestContext) {
    await this.attachmentService.delete(ctx.params.id)
    return reply.noContent()
  }
}
