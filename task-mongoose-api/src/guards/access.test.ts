import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { Container, JOB_DISPATCHER, defineModule } from '@forinda/kickjs'
import { createTestApp } from '@forinda/kickjs-testing'
import { jwtStrategy } from '@/auth'
import { AuthAdapter } from '@/adapters/auth.adapter'
import { WORKSPACE_MEMBER_REPOSITORY } from '@/modules/workspaces/workspace-member.repository'
import { PROJECT_REPOSITORY } from '@/modules/projects/project.repository'
import { USER_REPOSITORY } from '@/modules/users/user.repository'
import { TASK_REPOSITORY } from '@/modules/tasks/task.repository'
import { TasksController } from '@/modules/tasks/task.controller'
import { CHANNEL_REPOSITORY } from '@/modules/channels/channel.repository'
import { ChannelsController } from '@/modules/channels/channel.controller'
import { MESSAGE_REPOSITORY } from '@/modules/messages/message.repository'
import { MessagesController } from '@/modules/messages/message.controller'
import { COMMENT_REPOSITORY } from '@/modules/comments/comment.repository'
import { CommentsController } from '@/modules/comments/comment.controller'
import { ATTACHMENT_REPOSITORY } from '@/modules/attachments/attachment.repository'
import { AttachmentsController } from '@/modules/attachments/attachment.controller'
import { LABEL_REPOSITORY } from '@/modules/labels/label.repository'
import { LabelsController } from '@/modules/labels/label.controller'

const SECRET = 'test-secret-that-is-at-least-32-chars-long!'

// Workspace A holds project pA, task tA, channel cA, message mA, comment kA,
// attachment aA and label lA. uA is a member of A; uB only of workspace B.
const memberships: Record<string, string> = { uA: 'wsA', uB: 'wsB' }
const byId =
  <T>(rows: Record<string, T>) =>
  async (id: string) =>
    rows[id] ?? null

const TestModule = defineModule({
  name: 'AccessTestModule',
  build: () => ({
    register(container) {
      container.registerInstance(WORKSPACE_MEMBER_REPOSITORY, {
        findByUserAndWorkspace: async (userId: string, workspaceId: string) =>
          memberships[userId] === workspaceId ? { role: 'member' } : null,
      } as never)
      container.registerInstance(PROJECT_REPOSITORY, {
        findById: byId({ pA: { _id: 'pA', workspaceId: 'wsA' } }),
      } as never)
      container.registerInstance(TASK_REPOSITORY, {
        findById: byId({
          tA: { _id: 'tA', projectId: 'pA', workspaceId: 'wsA', title: 'Ship it' },
        }),
      } as never)
      container.registerInstance(CHANNEL_REPOSITORY, {
        findById: byId({
          cA: { _id: 'cA', workspaceId: 'wsA', type: 'public', memberIds: ['uA'] },
        }),
      } as never)
      container.registerInstance(MESSAGE_REPOSITORY, {
        findById: byId({ mA: { _id: 'mA', channelId: 'cA', senderId: 'uA' } }),
      } as never)
      container.registerInstance(COMMENT_REPOSITORY, {
        findById: byId({ kA: { _id: 'kA', taskId: 'tA', authorId: 'uA' } }),
      } as never)
      container.registerInstance(ATTACHMENT_REPOSITORY, {
        findById: byId({ aA: { _id: 'aA', taskId: 'tA' } }),
      } as never)
      container.registerInstance(LABEL_REPOSITORY, {
        findById: byId({ lA: { _id: 'lA', workspaceId: 'wsA' } }),
      } as never)
      container.registerInstance(USER_REPOSITORY, {} as never)
      container.registerInstance(JOB_DISPATCHER, {} as never)
    },
    routes: () =>
      [
        TasksController,
        ChannelsController,
        MessagesController,
        CommentsController,
        AttachmentsController,
        LabelsController,
      ].map((controller) => ({ path: '/', controller })),
  }),
})

const as = (sub: string) => `Bearer ${jwt.sign({ sub, email: `${sub}@test.com` }, SECRET)}`

async function makeApp() {
  const { app } = await createTestApp({
    modules: [TestModule()],
    adapters: [
      AuthAdapter({
        defaultPolicy: 'protected',
        strategies: [
          jwtStrategy({
            secret: SECRET,
            mapPayload: (p) => ({ id: p.sub!, email: p.email, globalRole: 'user' }),
          }),
        ],
      }),
    ],
  })
  return request(app.handle.bind(app))
}

describe('workspace scoping', () => {
  beforeEach(() => Container.reset())

  it('serves a member', async () => {
    const api = await makeApp()
    const res = await api.get('/api/v1/tasks/tA').set('Authorization', as('uA')).expect(200)
    expect(res.body.data.title).toBe('Ship it')
  })

  it("answers a user from another workspace with the not-found 404 on workspace A's records", async () => {
    const api = await makeApp()
    const auth = as('uB')
    const missing = await api.get('/api/v1/tasks/nope').set('Authorization', auth).expect(404)

    const task = [
      await api.get('/api/v1/tasks/tA').set('Authorization', auth).expect(404),
      await api
        .patch('/api/v1/tasks/tA')
        .set('Authorization', auth)
        .send({ title: 'x' })
        .expect(404),
      await api.delete('/api/v1/tasks/tA').set('Authorization', auth).expect(404),
    ]
    for (const res of task) expect(res.body).toEqual(missing.body)

    const routes: [method: 'get' | 'patch' | 'delete', path: string, body?: object][] = [
      ['get', '/api/v1/channels/cA'],
      ['delete', '/api/v1/channels/cA'],
      ['patch', '/api/v1/messages/mA', { content: 'x' }],
      ['delete', '/api/v1/messages/mA'],
      ['patch', '/api/v1/comments/kA', { body: 'x' }],
      ['delete', '/api/v1/comments/kA'],
      ['get', '/api/v1/attachments/aA'],
      ['get', '/api/v1/attachments/aA/download'],
      ['delete', '/api/v1/attachments/aA'],
      ['patch', '/api/v1/labels/lA', { name: 'x' }],
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
    const auth = as('uB')
    for (const path of [
      '/api/v1/projects/pA/tasks',
      '/api/v1/workspaces/wsA/channels',
      '/api/v1/channels/cA/messages',
      '/api/v1/tasks/tA/comments',
      '/api/v1/tasks/tA/attachments',
      '/api/v1/workspaces/wsA/labels',
    ]) {
      const res = await api.get(path).set('Authorization', auth)
      expect(res.status, path).toBe(404)
      expect(res.body.data).toBeUndefined()
    }
  })
})
