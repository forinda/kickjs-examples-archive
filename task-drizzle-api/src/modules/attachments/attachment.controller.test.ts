import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import {
  Container,
  Controller,
  Get,
  Delete,
  Inject,
  parseQuery,
  reply,
  HttpException,
  buildRoutes,
  type RequestContext,
  type ParsedQuery,
} from '@forinda/kickjs'
import { createTestApp, createTestModule } from '@forinda/kickjs-testing'
import {
  ATTACHMENT_REPOSITORY,
  type Attachment,
  type AttachmentRepository,
  type NewAttachment,
} from './attachment.repository'

// ── In-memory repository ─────────────────────────────────────────────

class InMemoryAttachmentRepository implements AttachmentRepository {
  private attachments: Attachment[] = [
    {
      id: 'att1',
      taskId: 't1',
      uploaderId: 'u1',
      fileName: 'report.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      data: 'base64pdfdata',
      createdAt: new Date(),
    },
    {
      id: 'att2',
      taskId: 't1',
      uploaderId: 'u2',
      fileName: 'image.png',
      fileSize: 2048,
      mimeType: 'image/png',
      data: 'base64pngdata',
      createdAt: new Date(),
    },
  ]

  async findById(id: string) {
    return this.attachments.find((a) => a.id === id) ?? null
  }

  async findByTask(taskId: string) {
    return this.attachments.filter((a) => a.taskId === taskId)
  }

  async findPaginated(parsed: ParsedQuery, taskId?: string) {
    let filtered = this.attachments
    if (taskId) filtered = filtered.filter((a) => a.taskId === taskId)
    const page = parsed.pagination?.page ?? 1
    const limit = parsed.pagination?.limit ?? 20
    const start = (page - 1) * limit
    return { data: filtered.slice(start, start + limit), total: filtered.length }
  }

  async create(dto: NewAttachment) {
    const attachment: Attachment = {
      id: `att${this.attachments.length + 1}`,
      taskId: dto.taskId,
      uploaderId: dto.uploaderId,
      fileName: dto.fileName,
      fileSize: dto.fileSize,
      mimeType: dto.mimeType,
      data: dto.data,
      createdAt: new Date(),
    }
    this.attachments.push(attachment)
    return attachment
  }

  async delete(id: string) {
    this.attachments = this.attachments.filter((a) => a.id !== id)
  }
}

// ── Test controller (no auth middleware) ──────────────────────────────

@Controller()
class TestAttachmentController {
  constructor(@Inject(ATTACHMENT_REPOSITORY) private readonly repo: AttachmentRepository) {}

  @Get('/')
  async list(ctx: RequestContext) {
    const result = await this.repo.findPaginated(
      parseQuery({}),
      ctx.query.taskId as string | undefined,
    )
    return { data: result.data, total: result.total }
  }

  @Get('/:id')
  async getById(ctx: RequestContext) {
    const result = await this.repo.findById(ctx.params.id)
    if (!result) throw HttpException.notFound('Attachment not found')
    return { data: result }
  }

  @Delete('/:id')
  async remove(ctx: RequestContext) {
    await this.repo.delete(ctx.params.id)
    return reply.noContent()
  }
}

// ── Tests ────────────────────────────────────────────────────────────

describe('AttachmentController (integration)', () => {
  beforeEach(() => Container.reset())

  function buildTestModule() {
    return createTestModule({
      register: (c) => {
        c.registerFactory(ATTACHMENT_REPOSITORY, () => new InMemoryAttachmentRepository())
        c.register(TestAttachmentController, TestAttachmentController)
      },
      routes: () => ({
        path: '/attachments',
        router: buildRoutes(TestAttachmentController),
        controller: TestAttachmentController,
      }),
    })
  }

  it('GET /api/v1/attachments returns all attachments', async () => {
    const { app } = await createTestApp({ modules: [buildTestModule()] })

    const res = await request(app.handle.bind(app)).get('/api/v1/attachments').expect(200)

    expect(res.body.data).toHaveLength(2)
    expect(res.body.total).toBe(2)
    expect(res.body.data[0]).toHaveProperty('fileName', 'report.pdf')
  })

  it('GET /api/v1/attachments/:id returns a single attachment', async () => {
    const { app } = await createTestApp({ modules: [buildTestModule()] })

    const res = await request(app.handle.bind(app)).get('/api/v1/attachments/att1').expect(200)

    expect(res.body.data.fileName).toBe('report.pdf')
    expect(res.body.data.mimeType).toBe('application/pdf')
  })

  it('GET /api/v1/attachments/:id returns 404 for unknown attachment', async () => {
    const { app } = await createTestApp({ modules: [buildTestModule()] })

    await request(app.handle.bind(app)).get('/api/v1/attachments/unknown').expect(404)
  })

  it('DELETE /api/v1/attachments/:id removes the attachment', async () => {
    const { app } = await createTestApp({ modules: [buildTestModule()] })

    await request(app.handle.bind(app)).delete('/api/v1/attachments/att1').expect(204)

    await request(app.handle.bind(app)).get('/api/v1/attachments/att1').expect(404)
  })

  it('DELETE then list shows reduced count', async () => {
    const { app } = await createTestApp({ modules: [buildTestModule()] })

    await request(app.handle.bind(app)).delete('/api/v1/attachments/att1').expect(204)

    const res = await request(app.handle.bind(app)).get('/api/v1/attachments').expect(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].fileName).toBe('image.png')
  })
})
