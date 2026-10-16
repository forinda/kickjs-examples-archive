import {
  Inject,
  reply,
  Controller,
  Get,
  Post,
  Delete,
  FileUpload,
  ApiQueryParams,
  type RequestContext,
  HttpException,
} from '@forinda/kickjs'
import { z } from 'zod'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { ErrorCode } from '@/shared/error-codes'
import { successResponse } from '@/shared/api-response'
import { ATTACHMENT_QUERY_CONFIG } from '@/shared/query-configs'
import { getUser } from '@/auth'
import { ATTACHMENT_REPOSITORY, type AttachmentRepository } from './attachment.repository'
import { TASK_REPOSITORY, type TaskRepository } from '@/modules/tasks/task.repository'

@ApiTags('Attachments')
@ApiBearerAuth()
@Controller()
export class AttachmentsController {
  @Inject(ATTACHMENT_REPOSITORY) private attachmentRepo!: AttachmentRepository
  @Inject(TASK_REPOSITORY) private taskRepo!: TaskRepository

  @ApiOperation({ summary: 'Upload an attachment for a task' })
  @ApiResponse({ status: 201, description: 'Attachment uploaded and stored' })
  @ApiResponse({ status: 400, description: 'No file uploaded' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('/tasks/:taskId/attachments', {
    params: z.object({ taskId: z.string() }),
  })
  @FileUpload({
    mode: 'single',
    fieldName: 'file',
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/*', 'application/pdf', 'text/*', 'application/zip'],
  })
  async create(ctx: RequestContext) {
    const file = ctx.file
    if (!file) {
      throw HttpException.badRequest('No file uploaded. Use field name "file".')
    }

    const user = getUser(ctx)

    const base64Data = file.buffer.toString('base64')

    const attachment = await this.attachmentRepo.create({
      taskId: ctx.params.taskId as any,
      uploadedById: user.id as any,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      base64Data,
    })

    await this.taskRepo.incrementAttachmentCount(ctx.params.taskId, 1)

    return reply.created(
      successResponse({
        id: attachment._id.toString(),
        fileName: attachment.fileName,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
        createdAt: attachment.createdAt,
      }),
    )
  }

  @ApiOperation({ summary: 'List attachments for a task' })
  @ApiResponse({ status: 200, description: 'List of attachments returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('/tasks/:taskId/attachments', { params: z.object({ taskId: z.string() }) })
  @ApiQueryParams(ATTACHMENT_QUERY_CONFIG)
  async list(ctx: RequestContext) {
    return ctx.paginate(
      (parsed) => this.attachmentRepo.findPaginated(parsed, { taskId: ctx.params.taskId }),
      ATTACHMENT_QUERY_CONFIG,
    )
  }

  @ApiOperation({ summary: 'Get a single attachment by ID' })
  @ApiResponse({ status: 200, description: 'Attachment details returned' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  @Get('/attachments/:attachmentId', { params: z.object({ attachmentId: z.string() }) })
  async getOne(ctx: RequestContext) {
    const attachment = await this.attachmentRepo.findById(ctx.params.attachmentId)
    if (!attachment) throw HttpException.notFound(ErrorCode.ATTACHMENT_NOT_FOUND)
    return successResponse({
      id: attachment._id.toString(),
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
      base64Data: attachment.base64Data,
      createdAt: attachment.createdAt,
    })
  }

  @ApiOperation({ summary: 'Download an attachment file' })
  @ApiResponse({ status: 200, description: 'Attachment file binary returned' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  @Get('/attachments/:attachmentId/download', { params: z.object({ attachmentId: z.string() }) })
  async download(ctx: RequestContext) {
    const attachment = await this.attachmentRepo.findById(ctx.params.attachmentId)
    if (!attachment) throw HttpException.notFound(ErrorCode.ATTACHMENT_NOT_FOUND)

    const buffer = Buffer.from(attachment.base64Data, 'base64')
    // RFC 6266 filename encoding — an uploaded name can't break the header.
    return ctx.download(buffer, attachment.fileName, attachment.mimeType)
  }

  @ApiOperation({ summary: 'Delete an attachment' })
  @ApiResponse({ status: 200, description: 'Attachment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  @Delete('/attachments/:attachmentId', { params: z.object({ attachmentId: z.string() }) })
  async delete(ctx: RequestContext) {
    const attachment = await this.attachmentRepo.findById(ctx.params.attachmentId)
    if (!attachment) throw HttpException.notFound(ErrorCode.ATTACHMENT_NOT_FOUND)
    await this.attachmentRepo.delete(ctx.params.attachmentId)
    await this.taskRepo.incrementAttachmentCount(attachment.taskId.toString(), -1)
    return successResponse(null, 'Attachment deleted')
  }
}
