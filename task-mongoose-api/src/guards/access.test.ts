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
import { ProjectsController } from '@/modules/projects/project.controller'
import { UsersController } from '@/modules/users/user.controller'
import { WorkspacesController } from '@/modules/workspaces/workspace.controller'
import { WORKSPACE_REPOSITORY } from '@/modules/workspaces/workspace.repository'

const SECRET = 'test-secret-that-is-at-least-32-chars-long!'

// Workspace A holds project pA, task tA (reported by uA), public channel cA
// (created by uO), private channel cP (member: uA), messages mA (by uA) and mB
// (by uM), comments kA (by uA) and kB (by uM), attachment aA and label lA.
// uA is A's admin, uM and uO members; uB belongs to workspace B only; uL to none.
const memberships: Record<string, [workspaceId: string, role: string]> = {
  uA: ['wsA', 'admin'],
  uM: ['wsA', 'member'],
  uO: ['wsA', 'member'],
  uB: ['wsB', 'member'],
}
const allUsers = ['uA', 'uM', 'uO', 'uB', 'uL'].map((id) => ({ _id: id, email: `${id}@test.com` }))
// Mirrors the repository's query scope: the viewer plus anyone sharing a workspace.
const visibleTo = (viewerId: string) =>
  allUsers.filter(
    (u) =>
      u._id === viewerId ||
      (memberships[u._id] && memberships[u._id][0] === memberships[viewerId]?.[0]),
  )
const added: string[] = []
const update = async (id: string, data: object) => ({ _id: id, ...data })
const done = async () => true
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
          memberships[userId]?.[0] === workspaceId ? { role: memberships[userId][1] } : null,
        create: async (row: { userId: string }) => (added.push(row.userId), row),
      } as never)
      container.registerInstance(PROJECT_REPOSITORY, {
        findById: byId({ pA: { _id: 'pA', workspaceId: 'wsA' } }),
        update,
      } as never)
      container.registerInstance(TASK_REPOSITORY, {
        findById: byId({
          tA: {
            _id: 'tA',
            projectId: 'pA',
            workspaceId: 'wsA',
            title: 'Ship it',
            reporterId: 'uA',
            assigneeIds: [],
          },
        }),
        update,
        delete: done,
      } as never)
      container.registerInstance(CHANNEL_REPOSITORY, {
        findById: byId({
          cA: {
            _id: 'cA',
            workspaceId: 'wsA',
            type: 'public',
            memberIds: ['uA'],
            createdById: 'uO',
          },
          cP: {
            _id: 'cP',
            workspaceId: 'wsA',
            type: 'private',
            memberIds: ['uA'],
            createdById: 'uA',
          },
        }),
        delete: done,
        addMember: done,
        removeMember: done,
      } as never)
      container.registerInstance(MESSAGE_REPOSITORY, {
        findById: byId({
          mA: { _id: 'mA', channelId: 'cA', senderId: 'uA' },
          mB: { _id: 'mB', channelId: 'cA', senderId: 'uM' },
        }),
        findByChannel: async () => [],
        update,
      } as never)
      container.registerInstance(COMMENT_REPOSITORY, {
        findById: byId({
          kA: { _id: 'kA', taskId: 'tA', authorId: 'uA' },
          kB: { _id: 'kB', taskId: 'tA', authorId: 'uM' },
        }),
        update,
      } as never)
      container.registerInstance(ATTACHMENT_REPOSITORY, {
        findById: byId({ aA: { _id: 'aA', taskId: 'tA' } }),
      } as never)
      container.registerInstance(LABEL_REPOSITORY, {
        findById: byId({ lA: { _id: 'lA', workspaceId: 'wsA' } }),
      } as never)
      container.registerInstance(USER_REPOSITORY, {
        findByEmail: async (email: string) => allUsers.find((u) => u.email === email) ?? null,
        findVisibleById: async (id: string, viewerId: string) =>
          visibleTo(viewerId).find((u) => u._id === id) ?? null,
        findPaginated: async (
          parsed: { pagination: { offset: number; limit: number } },
          viewerId: string,
        ) => {
          const rows = visibleTo(viewerId)
          const { offset, limit } = parsed.pagination
          return { data: rows.slice(offset, offset + limit), total: rows.length }
        },
      } as never)
      container.registerInstance(WORKSPACE_REPOSITORY, {
        findById: byId({ wsA: { _id: 'wsA', name: 'Acme' } }),
      } as never)
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
        ProjectsController,
      ]
        .map((controller) => ({ path: '/', controller }))
        .concat([
          { path: '/users', controller: UsersController },
          { path: '/workspaces', controller: WorkspacesController },
        ] as never[]),
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

describe('object-level authorization', () => {
  beforeEach(() => Container.reset())

  it('refuses to add a user from another workspace, as if they did not exist', async () => {
    const api = await makeApp()
    const auth = as('uA')
    for (const res of [
      await api
        .post('/api/v1/channels/cA/members')
        .set('Authorization', auth)
        .send({ userId: 'uB' }),
      await api
        .patch('/api/v1/tasks/tA/assignees')
        .set('Authorization', auth)
        .send({ assigneeIds: ['uB'] }),
      await api
        .post('/api/v1/projects/pA/tasks')
        .set('Authorization', auth)
        .send({ title: 'x', assigneeIds: ['uB'] }),
    ]) {
      expect(res.status).toBe(404)
      expect(JSON.stringify(res.body)).toContain('USER_NOT_FOUND')
    }
    // Teammates from the same workspace are fine.
    await api
      .post('/api/v1/channels/cA/members')
      .set('Authorization', auth)
      .send({ userId: 'uM' })
      .expect(200)
    await api
      .patch('/api/v1/tasks/tA/assignees')
      .set('Authorization', auth)
      .send({ assigneeIds: ['uM'] })
      .expect(200)
  })

  it('hides a private channel from workspace members outside it', async () => {
    const api = await makeApp()
    const auth = as('uM')
    await api.get('/api/v1/channels/cP').set('Authorization', auth).expect(404)
    await api.get('/api/v1/channels/cP/messages').set('Authorization', auth).expect(404)
    await api
      .post('/api/v1/channels/cP/members')
      .set('Authorization', auth)
      .send({ userId: 'uM' })
      .expect(404)
    // Its member reads it; a public channel is open to every workspace member.
    await api.get('/api/v1/channels/cP').set('Authorization', as('uA')).expect(200)
    await api.get('/api/v1/channels/cA/messages').set('Authorization', auth).expect(200)
  })

  it('lets only the creator or an admin delete a channel or remove others', async () => {
    const api = await makeApp()
    const member = as('uM')
    await api.delete('/api/v1/channels/cA').set('Authorization', member).expect(403)
    await api.delete('/api/v1/channels/cA/members/uO').set('Authorization', member).expect(403)
    await api.delete('/api/v1/channels/cA/members/uM').set('Authorization', member).expect(200)
    await api.delete('/api/v1/channels/cA').set('Authorization', as('uO')).expect(200)
    await api.delete('/api/v1/channels/cA').set('Authorization', as('uA')).expect(200)
  })

  it('lets only the author or an admin edit a message or comment', async () => {
    const api = await makeApp()
    const other = as('uO')
    await api
      .patch('/api/v1/messages/mB')
      .set('Authorization', other)
      .send({ content: 'x' })
      .expect(403)
    await api
      .patch('/api/v1/comments/kB')
      .set('Authorization', other)
      .send({ body: 'x' })
      .expect(403)
    await api
      .patch('/api/v1/messages/mB')
      .set('Authorization', as('uM'))
      .send({ content: 'x' })
      .expect(200)
    await api
      .patch('/api/v1/messages/mB')
      .set('Authorization', as('uA'))
      .send({ content: 'x' })
      .expect(200)
    await api
      .patch('/api/v1/comments/kB')
      .set('Authorization', as('uA'))
      .send({ body: 'x' })
      .expect(200)
  })

  it('lets any member edit a task but only the reporter or an admin delete it or change the project', async () => {
    const api = await makeApp()
    const member = as('uM')
    await api
      .patch('/api/v1/tasks/tA')
      .set('Authorization', member)
      .send({ title: 'x' })
      .expect(200)
    await api.delete('/api/v1/tasks/tA').set('Authorization', member).expect(403)
    await api
      .patch('/api/v1/projects/pA')
      .set('Authorization', member)
      .send({ name: 'x' })
      .expect(403)
    await api.delete('/api/v1/projects/pA').set('Authorization', member).expect(403)
    await api
      .patch('/api/v1/projects/pA')
      .set('Authorization', as('uA'))
      .send({ name: 'x' })
      .expect(200)
  })
})

describe('user visibility', () => {
  beforeEach(() => Container.reset())

  const ids = (res: { body: { data: { _id: string }[] } }) => res.body.data.map((u) => u._id).sort()

  it('lists only the caller and people who share a workspace with them', async () => {
    const api = await makeApp()
    const res = await api.get('/api/v1/users').set('Authorization', as('uA')).expect(200)
    expect(ids(res)).toEqual(['uA', 'uM', 'uO'])
    const lone = await api.get('/api/v1/users').set('Authorization', as('uL')).expect(200)
    expect(ids(lone)).toEqual(['uL'])
  })

  it('counts the scoped set in the pagination total', async () => {
    const api = await makeApp()
    const res = await api
      .get('/api/v1/users?page=1&limit=1')
      .set('Authorization', as('uA'))
      .expect(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.meta.total).toBe(3)
  })

  it('answers a user outside every shared workspace with the same 404 as a missing one', async () => {
    const api = await makeApp()
    const auth = as('uA')
    const missing = await api.get('/api/v1/users/nope').set('Authorization', auth).expect(404)
    const outsider = await api.get('/api/v1/users/uB').set('Authorization', auth).expect(404)
    expect(outsider.body).toEqual(missing.body)
    await api.get('/api/v1/users/uM').set('Authorization', auth).expect(200)
    await api.get('/api/v1/users/uA').set('Authorization', auth).expect(200)
    await api.get('/api/v1/users/uL').set('Authorization', as('uL')).expect(200)
  })

  it('still invites an outsider by email, answering the same as for an unknown email', async () => {
    const api = await makeApp()
    const auth = as('uA')
    const known = await api
      .post('/api/v1/workspaces/wsA/invite')
      .set('Authorization', auth)
      .send({ email: 'uL@test.com' })
      .expect(202)
    const unknown = await api
      .post('/api/v1/workspaces/wsA/invite')
      .set('Authorization', auth)
      .send({ email: 'nobody@test.com' })
      .expect(202)
    expect(known.body).toEqual(unknown.body)
    expect(added).toContain('uL')
  })
})
