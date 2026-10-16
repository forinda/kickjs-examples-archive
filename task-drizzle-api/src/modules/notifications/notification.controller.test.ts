import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import {
  Container,
  Controller,
  Get,
  Put,
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
  NOTIFICATION_REPOSITORY,
  type NewNotification,
  type Notification,
  type NotificationRepository,
} from './notification.repository'

// ── In-memory repository ─────────────────────────────────────────────

class InMemoryNotificationRepository implements NotificationRepository {
  private notifications: Notification[] = [
    {
      id: 'n1',
      recipientId: 'u1',
      type: 'task_assigned',
      title: 'Task assigned',
      body: 'You have been assigned PROJ-1',
      metadata: {},
      isRead: false,
      createdAt: new Date(),
    },
    {
      id: 'n2',
      recipientId: 'u1',
      type: 'mentioned',
      title: 'Mentioned',
      body: 'You were mentioned in a comment',
      metadata: {},
      isRead: false,
      createdAt: new Date(),
    },
    {
      id: 'n3',
      recipientId: 'u2',
      type: 'comment_added',
      title: 'New comment',
      body: 'A comment was added to your task',
      metadata: {},
      isRead: false,
      createdAt: new Date(),
    },
  ]

  async findById(id: string) {
    return this.notifications.find((n) => n.id === id) ?? null
  }

  async findPaginated(parsed: ParsedQuery, recipientId: string) {
    const filtered = this.notifications.filter((n) => n.recipientId === recipientId)
    const page = parsed.pagination?.page ?? 1
    const limit = parsed.pagination?.limit ?? 20
    const start = (page - 1) * limit
    return { data: filtered.slice(start, start + limit), total: filtered.length }
  }

  async create(dto: NewNotification) {
    const notification: Notification = {
      id: `n${this.notifications.length + 1}`,
      recipientId: dto.recipientId,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      metadata: dto.metadata ?? {},
      isRead: dto.isRead ?? false,
      createdAt: new Date(),
    }
    this.notifications.push(notification)
    return notification
  }

  async markRead(id: string, recipientId: string) {
    const n = this.notifications.find((n) => n.id === id && n.recipientId === recipientId)
    if (n) n.isRead = true
  }

  async markAllRead(recipientId: string) {
    this.notifications
      .filter((n) => n.recipientId === recipientId)
      .forEach((n) => (n.isRead = true))
  }

  async unreadCount(recipientId: string) {
    return this.notifications.filter((n) => n.recipientId === recipientId && !n.isRead).length
  }

  async delete(id: string) {
    this.notifications = this.notifications.filter((n) => n.id !== id)
  }
}

// ── Test controller (no auth middleware) ──────────────────────────────
// Uses a fixed recipientId header instead of auth middleware

@Controller()
class TestNotificationController {
  constructor(@Inject(NOTIFICATION_REPOSITORY) private readonly repo: NotificationRepository) {}

  @Get('/')
  async list(ctx: RequestContext) {
    const recipientId = ctx.headers['x-user-id'] as string
    if (!recipientId) throw HttpException.badRequest('x-user-id header is required')
    const result = await this.repo.findPaginated(parseQuery({}), recipientId)
    return { data: result.data, total: result.total }
  }

  @Get('/unread-count')
  async unreadCount(ctx: RequestContext) {
    const recipientId = ctx.headers['x-user-id'] as string
    if (!recipientId) throw HttpException.badRequest('x-user-id header is required')
    const count = await this.repo.unreadCount(recipientId)
    return { data: { count } }
  }

  @Put('/:id/read')
  async markRead(ctx: RequestContext) {
    await this.repo.markRead(ctx.params.id, 'u1')
    return reply.noContent()
  }

  @Put('/read-all')
  async markAllRead(ctx: RequestContext) {
    const recipientId = ctx.headers['x-user-id'] as string
    if (!recipientId) throw HttpException.badRequest('x-user-id header is required')
    await this.repo.markAllRead(recipientId)
    return reply.noContent()
  }
}

// ── Tests ────────────────────────────────────────────────────────────

describe('NotificationController (integration)', () => {
  beforeEach(() => Container.reset())

  function buildTestModule() {
    return createTestModule({
      register: (c) => {
        c.registerFactory(NOTIFICATION_REPOSITORY, () => new InMemoryNotificationRepository())
        c.register(TestNotificationController, TestNotificationController)
      },
      routes: () => ({
        path: '/notifications',
        router: buildRoutes(TestNotificationController),
        controller: TestNotificationController,
      }),
    })
  }

  it('GET /api/v1/notifications returns notifications for a user', async () => {
    const { app } = await createTestApp({ modules: [buildTestModule()] })

    const res = await request(app.handle.bind(app))
      .get('/api/v1/notifications')
      .set('x-user-id', 'u1')
      .expect(200)

    expect(res.body.data).toHaveLength(2)
    expect(res.body.total).toBe(2)
  })

  it('GET /api/v1/notifications/unread-count returns unread count', async () => {
    const { app } = await createTestApp({ modules: [buildTestModule()] })

    const res = await request(app.handle.bind(app))
      .get('/api/v1/notifications/unread-count')
      .set('x-user-id', 'u1')
      .expect(200)

    expect(res.body.data.count).toBe(2)
  })

  it('PUT /api/v1/notifications/:id/read marks a notification as read', async () => {
    const { app } = await createTestApp({ modules: [buildTestModule()] })

    await request(app.handle.bind(app)).put('/api/v1/notifications/n1/read').expect(204)

    const res = await request(app.handle.bind(app))
      .get('/api/v1/notifications/unread-count')
      .set('x-user-id', 'u1')
      .expect(200)

    expect(res.body.data.count).toBe(1)
  })

  it('PUT /api/v1/notifications/read-all marks all as read for a user', async () => {
    const { app } = await createTestApp({ modules: [buildTestModule()] })

    await request(app.handle.bind(app))
      .put('/api/v1/notifications/read-all')
      .set('x-user-id', 'u1')
      .expect(204)

    const res = await request(app.handle.bind(app))
      .get('/api/v1/notifications/unread-count')
      .set('x-user-id', 'u1')
      .expect(200)

    expect(res.body.data.count).toBe(0)

    // u2 should still have unread notifications
    const res2 = await request(app.handle.bind(app))
      .get('/api/v1/notifications/unread-count')
      .set('x-user-id', 'u2')
      .expect(200)

    expect(res2.body.data.count).toBe(1)
  })
})
