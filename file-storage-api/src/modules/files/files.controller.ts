import {
  Controller,
  Delete,
  FileUpload,
  Get,
  HttpException,
  Inject,
  Middleware,
  Post,
  reply,
  type Ctx,
} from '@forinda/kickjs'
import { z } from 'zod'
import { env } from '@/config'
import { apiKeyGuard } from '@/guards/api-key.guard'
import { ALLOWED_TYPES, FILE_ID, FilesService } from './files.service'

export const idParams = z.object({ id: z.string().regex(FILE_ID) })
export const listQuery = z.object({ cursor: z.string().optional() })
// Up to 7 days — S3's limit for a presigned URL.
export const urlQuery = z.object({
  expiresIn: z.coerce.number().int().min(1).max(604_800).default(300),
})
export const signedQuery = z.object({ expires: z.coerce.number().int(), sig: z.string() })

@Controller()
export class FilesController {
  @Inject(FilesService) private readonly files!: FilesService

  /** multipart/form-data, field `file`. Too big → 413, a type not in ALLOWED_TYPES → 415. */
  @Post('/')
  @Middleware(apiKeyGuard)
  @FileUpload({
    mode: 'single',
    fieldName: 'file',
    maxSize: env.MAX_UPLOAD_BYTES,
    allowedTypes: Object.keys(ALLOWED_TYPES),
  })
  async upload(ctx: Ctx<KickRoutes.FilesController['upload']>) {
    if (!ctx.file) throw HttpException.badRequest('Send the file in the `file` form field')
    return reply.created(await this.files.save(ctx.file.buffer, ctx.file.mimetype))
  }

  @Get('/', { query: listQuery })
  @Middleware(apiKeyGuard)
  list(ctx: Ctx<KickRoutes.FilesController['list']>) {
    return this.files.list(ctx.query.cursor)
  }

  @Get('/:id', { params: idParams })
  @Middleware(apiKeyGuard)
  async download(ctx: Ctx<KickRoutes.FilesController['download']>) {
    await this.send(ctx, ctx.params.id)
  }

  @Get('/:id/url', { params: idParams, query: urlQuery })
  @Middleware(apiKeyGuard)
  async url(ctx: Ctx<KickRoutes.FilesController['url']>) {
    if (!(await this.files.exists(ctx.params.id))) throw HttpException.notFound()
    const origin = env.PUBLIC_URL ?? `http://${ctx.headers.host}`
    return this.files.signedUrl(ctx.params.id, ctx.query.expiresIn, origin)
  }

  /** The target of a disk signed URL: no API key, the signature is the credential. */
  @Get('/:id/signed', { params: idParams, query: signedQuery })
  async signed(ctx: Ctx<KickRoutes.FilesController['signed']>) {
    const { id } = ctx.params
    if (!this.files.verifySignature(id, ctx.query.expires, ctx.query.sig)) {
      throw HttpException.forbidden('Link expired or invalid')
    }
    await this.send(ctx, id)
  }

  @Delete('/:id', { params: idParams })
  @Middleware(apiKeyGuard)
  async remove(ctx: Ctx<KickRoutes.FilesController['remove']>) {
    if (!(await this.files.remove(ctx.params.id))) throw HttpException.notFound()
    return reply.noContent()
  }

  private async send(ctx: Ctx<KickRoutes.FilesController['download']>, id: string) {
    const file = await this.files.open(id)
    if (!file) throw HttpException.notFound()
    await ctx.sendResponse(
      new Response(file.body, {
        headers: {
          'content-type': file.contentType,
          'content-length': String(file.size),
          'content-disposition': `attachment; filename="${id}"`,
          'x-content-type-options': 'nosniff',
        },
      }),
    )
  }
}
