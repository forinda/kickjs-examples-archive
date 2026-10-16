import 'reflect-metadata'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// The env schema (src/config) requires these; authBridgeMiddleware verifies tokens with JWT_SECRET.
const SECRET = vi.hoisted(() => {
  process.env.DATABASE_URL ??= 'postgres://unused@localhost/unused'
  process.env.JWT_REFRESH_SECRET ??= 'refresh-secret-that-is-at-least-32-chars!'
  return (process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-chars-long!')
})

import '@/config'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { Container, defineModule } from '@forinda/kickjs'
import { createTestApp } from '@forinda/kickjs-testing'
import { PRISMA_CLIENT as DB_TOKEN } from '@/db/prisma'
import { WorkspaceController } from '@/modules/workspaces/workspace.controller'
import { WORKSPACE_REPOSITORY } from '@/modules/workspaces/workspace.repository'
import { WORKSPACE_MEMBER_REPOSITORY } from '@/modules/workspaces/workspace-member.repository'
import { ProjectController } from '@/modules/projects/project.controller'
import { PROJECT_REPOSITORY } from '@/modules/projects/project.repository'
import { TaskController } from '@/modules/tasks/task.controller'
import { TASK_REPOSITORY } from '@/modules/tasks/task.repository'
import { TASK_ASSIGNEE_REPOSITORY } from '@/modules/tasks/task-assignee.repository'
import { LabelController } from '@/modules/labels/label.controller'
import { LABEL_REPOSITORY } from '@/modules/labels/label.repository'
import { TASK_LABEL_REPOSITORY } from '@/modules/labels/task-label.repository'
import { ChannelController } from '@/modules/channels/channel.controller'
import { CHANNEL_REPOSITORY } from '@/modules/channels/channel.repository'
import { CHANNEL_MEMBER_REPOSITORY } from '@/modules/channels/channel-member.repository'
import { MessageController } from '@/modules/messages/message.controller'
import { MESSAGE_REPOSITORY } from '@/modules/messages/message.repository'
import { CommentController } from '@/modules/comments/comment.controller'
import { COMMENT_REPOSITORY } from '@/modules/comments/comment.repository'
import { AttachmentController } from '@/modules/attachments/attachment.controller'
import { ATTACHMENT_REPOSITORY } from '@/modules/attachments/attachment.repository'
import { ActivityController } from '@/modules/activities/activity.controller'
import { ACTIVITY_REPOSITORY } from '@/modules/activities/activity.repository'
import { StatController } from '@/modules/stats/stat.controller'
import { STATS_REPOSITORY } from '@/modules/stats/stat.repository'

// Workspace wA holds project pA, task tA, label lA, channel cA (member: u-admin),
// message mA, comment kA and attachment aA. u-admin is its admin, u-member a
// member; u-out belongs to another workspace only.
const roles: Record<string, string> = { 'u-admin': 'admin', 'u-member': 'member' }
const byId =
  <T>(rows: Record<string, T>) =>
  async (id: string) =>
    rows[id] ?? null

const TestModule = defineModule({
  name: 'AccessTestModule',
  build: () => ({
    register(container) {
      container.registerInstance(WORKSPACE_MEMBER_REPOSITORY, {
        findByWorkspaceAndUser: async (workspaceId: string, userId: string) =>
          workspaceId === 'wA' && roles[userId]
            ? { workspaceId, userId, role: roles[userId] }
            : null,
      } as never)
      container.registerInstance(WORKSPACE_REPOSITORY, {
        findById: byId({ wA: { id: 'wA', name: 'Acme' } }),
      } as never)
      container.registerInstance(PROJECT_REPOSITORY, {
        findById: byId({ pA: { id: 'pA', workspaceId: 'wA' } }),
      } as never)
      container.registerInstance(TASK_REPOSITORY, {
        findById: byId({ tA: { id: 'tA', projectId: 'pA', workspaceId: 'wA', title: 'Ship it' } }),
        update: async (id: string, data: object) => ({ id, ...data }),
        delete: async () => undefined,
      } as never)
      container.registerInstance(LABEL_REPOSITORY, {
        findById: byId({ lA: { id: 'lA', workspaceId: 'wA' } }),
      } as never)
      container.registerInstance(CHANNEL_REPOSITORY, {
        findById: byId({ cA: { id: 'cA', workspaceId: 'wA' } }),
      } as never)
      container.registerInstance(CHANNEL_MEMBER_REPOSITORY, {
        findByChannelAndUser: async (channelId: string, userId: string) =>
          channelId === 'cA' && userId === 'u-admin' ? { channelId, userId } : null,
      } as never)
      container.registerInstance(MESSAGE_REPOSITORY, {
        findById: byId({ mA: { id: 'mA', channelId: 'cA', senderId: 'u-admin' } }),
      } as never)
      container.registerInstance(COMMENT_REPOSITORY, {
        findById: byId({ kA: { id: 'kA', taskId: 'tA', authorId: 'u-admin' } }),
      } as never)
      container.registerInstance(ATTACHMENT_REPOSITORY, {
        findById: byId({ aA: { id: 'aA', taskId: 'tA' } }),
      } as never)
      for (const token of [
        TASK_ASSIGNEE_REPOSITORY,
        TASK_LABEL_REPOSITORY,
        ACTIVITY_REPOSITORY,
        STATS_REPOSITORY,
        DB_TOKEN,
      ]) {
        container.registerInstance(token, {} as never)
      }
    },
    routes: () => [
      { path: '/workspaces', controller: WorkspaceController },
      { path: '/projects', controller: ProjectController },
      { path: '/tasks', controller: TaskController },
      { path: '/labels', controller: LabelController },
      { path: '/channels', controller: ChannelController },
      { path: '/messages', controller: MessageController },
      { path: '/comments', controller: CommentController },
      { path: '/attachments', controller: AttachmentController },
      { path: '/activities', controller: ActivityController },
      { path: '/stats', controller: StatController },
    ],
  }),
})

const as = (sub: string) =>
  `Bearer ${jwt.sign({ sub, email: `${sub}@test.com`, globalRole: 'user' }, SECRET)}`

async function makeApp() {
  const { app } = await createTestApp({ modules: [TestModule()] })
  return request(app.handle.bind(app))
}

describe('workspace scoping', () => {
  beforeEach(() => Container.reset())

  it('serves a member', async () => {
    const api = await makeApp()
    const res = await api.get('/api/v1/tasks/tA').set('Authorization', as('u-member')).expect(200)
    expect(res.body.data.title).toBe('Ship it')
  })

  it('answers a non-member with the same 404 as a missing record', async () => {
    const api = await makeApp()
    const auth = as('u-out')
    const missing = await api.get('/api/v1/tasks/nope').set('Authorization', auth).expect(404)
    const get = await api.get('/api/v1/tasks/tA').set('Authorization', auth).expect(404)
    const update = await api
      .put('/api/v1/tasks/tA')
      .set('Authorization', auth)
      .send({ title: 'Mine now' })
      .expect(404)
    const del = await api.delete('/api/v1/tasks/tA').set('Authorization', auth).expect(404)
    for (const res of [get, update, del]) expect(res.body).toEqual(missing.body)
  })

  it("answers a user from another workspace with 404 on every one of workspace A's records", async () => {
    const api = await makeApp()
    const auth = as('u-out')
    const routes: [method: 'get' | 'put' | 'delete', path: string, body?: object][] = [
      ['get', '/api/v1/workspaces/wA'],
      ['get', '/api/v1/projects/pA'],
      ['put', '/api/v1/projects/pA', { name: 'x' }],
      ['delete', '/api/v1/projects/pA'],
      ['get', '/api/v1/channels/cA'],
      ['put', '/api/v1/channels/cA', { name: 'x' }],
      ['delete', '/api/v1/channels/cA'],
      ['put', '/api/v1/messages/mA', { content: 'x' }],
      ['delete', '/api/v1/messages/mA'],
      ['get', '/api/v1/comments/kA'],
      ['put', '/api/v1/comments/kA', { content: 'x' }],
      ['delete', '/api/v1/comments/kA'],
      ['get', '/api/v1/attachments/aA'],
      ['get', '/api/v1/attachments/aA/download'],
      ['delete', '/api/v1/attachments/aA'],
      ['get', '/api/v1/labels/lA'],
      ['delete', '/api/v1/labels/lA'],
    ]
    for (const [method, path, body] of routes) {
      const res = await api[method](path)
        .set('Authorization', auth)
        .send(body ?? {})
      expect(res.status, `${method} ${path}`).toBe(404)
    }
  })

  it("never lists workspace A's records to an outsider", async () => {
    const api = await makeApp()
    const auth = as('u-out')
    for (const path of [
      '/api/v1/tasks?projectId=pA',
      '/api/v1/comments?taskId=tA',
      '/api/v1/attachments?taskId=tA',
      '/api/v1/labels?workspaceId=wA',
      '/api/v1/channels?workspaceId=wA',
      '/api/v1/messages/channel/cA',
      '/api/v1/activities?workspaceId=wA',
      '/api/v1/projects/workspace/wA',
      '/api/v1/workspaces/wA/members',
      '/api/v1/stats/workspace/wA',
      '/api/v1/stats/project/pA',
    ]) {
      const res = await api.get(path).set('Authorization', auth)
      expect(res.status, path).toBe(404)
      expect(res.body.data).toBeUndefined()
    }
  })

  it('requires a filter on lists instead of listing every workspace', async () => {
    const api = await makeApp()
    await api.get('/api/v1/tasks').set('Authorization', as('u-member')).expect(400)
  })

  it('lets only admins manage members and the workspace', async () => {
    const api = await makeApp()
    const invite = { userId: '00000000-0000-4000-8000-000000000001', role: 'admin' }
    await api
      .post('/api/v1/workspaces/wA/members')
      .set('Authorization', as('u-out'))
      .send(invite)
      .expect(404)
    await api
      .post('/api/v1/workspaces/wA/members')
      .set('Authorization', as('u-member'))
      .send(invite)
      .expect(403)
    await api.delete('/api/v1/workspaces/wA').set('Authorization', as('u-member')).expect(403)
  })
})
