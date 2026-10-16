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
import { UserController } from '@/modules/users/user.controller'
import { USER_REPOSITORY } from '@/modules/users/user.repository'
import { STATS_REPOSITORY } from '@/modules/stats/stat.repository'

// Workspace wA holds project pA, task tA, label lA, public channel cA (created
// by u-other), private channel cP (member: u-admin), messages mA (by u-admin)
// and mB (by u-member), comments kA (by u-admin) and kB (by u-member), and
// attachment aA. u-admin is its admin, u-member and u-other members; u-out
// belongs to workspace wB only; uLone belongs to no workspace.
type Row = { workspaceId: string; userId: string; role: string; status: 'pending' | 'accepted' }
const seedRows = (): Row[] =>
  [
    ['wA', 'u-admin', 'admin'],
    ['wA', 'u-member', 'member'],
    ['wA', 'u-other', 'member'],
    ['wB', 'u-out', 'admin'],
  ].map(([workspaceId, userId, role]) => ({ workspaceId, userId, role, status: 'accepted' }))
// Reset per test (see beforeEach) so an accepted invite in one test can't leak into another.
let rows = seedRows()
const row = (workspaceId: string, userId: string) =>
  rows.find((r) => r.workspaceId === workspaceId && r.userId === userId)
const cP = '00000000-0000-4000-8000-0000000000c9'
const uLone = '00000000-0000-4000-8000-0000000000d1'
const workspacesOf = (userId: string) =>
  rows.filter((r) => r.userId === userId && r.status === 'accepted').map((r) => r.workspaceId)
const allUsers = ['u-admin', 'u-member', 'u-other', 'u-out', uLone].map((id) => ({
  id,
  email: `${id}@test.com`,
}))
// Mirrors the repository's SQL scope: the viewer plus anyone sharing an ACCEPTED membership.
const visibleTo = (viewerId: string) =>
  allUsers.filter(
    (u) => u.id === viewerId || workspacesOf(u.id).some((w) => workspacesOf(viewerId).includes(w)),
  )
const update = async (id: string, data: object) => ({ id, ...data })
const byId =
  <T>(rows: Record<string, T>) =>
  async (id: string) =>
    rows[id] ?? null

const TestModule = defineModule({
  name: 'AccessTestModule',
  build: () => ({
    register(container) {
      container.registerInstance(WORKSPACE_MEMBER_REPOSITORY, {
        findByWorkspaceAndUser: async (workspaceId: string, userId: string) => {
          const r = row(workspaceId, userId)
          return r?.status === 'accepted' ? r : null
        },
        findAnyByWorkspaceAndUser: async (workspaceId: string, userId: string) =>
          row(workspaceId, userId) ?? null,
        add: async (r: Row) => (rows.push(r), r),
        acceptInvite: async (workspaceId: string, userId: string) => {
          const r = row(workspaceId, userId)
          if (r?.status !== 'pending') return false
          r.status = 'accepted'
          return true
        },
        declineInvite: async (workspaceId: string, userId: string) => {
          const r = row(workspaceId, userId)
          if (r?.status !== 'pending') return false
          rows = rows.filter((x) => x !== r)
          return true
        },
      } as never)
      container.registerInstance(USER_REPOSITORY, {
        findById: async (id: string) => allUsers.find((u) => u.id === id) ?? null,
        findByEmail: async (email: string) => allUsers.find((u) => u.email === email) ?? null,
        findVisibleById: async (id: string, viewerId: string) =>
          visibleTo(viewerId).find((u) => u.id === id) ?? null,
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
        findById: byId({ wA: { id: 'wA', name: 'Acme' } }),
      } as never)
      container.registerInstance(PROJECT_REPOSITORY, {
        findById: byId({ pA: { id: 'pA', workspaceId: 'wA', leadId: null } }),
        update,
      } as never)
      container.registerInstance(TASK_REPOSITORY, {
        findById: byId({
          tA: {
            id: 'tA',
            projectId: 'pA',
            workspaceId: 'wA',
            title: 'Ship it',
            reporterId: 'u-admin',
          },
        }),
        update,
        delete: async () => undefined,
      } as never)
      container.registerInstance(LABEL_REPOSITORY, {
        findById: byId({ lA: { id: 'lA', workspaceId: 'wA' } }),
      } as never)
      container.registerInstance(CHANNEL_REPOSITORY, {
        findById: byId({
          cA: { id: 'cA', workspaceId: 'wA', type: 'public', createdById: 'u-other' },
          [cP]: { id: cP, workspaceId: 'wA', type: 'private', createdById: 'u-admin' },
        }),
        update,
        delete: async () => undefined,
      } as never)
      container.registerInstance(CHANNEL_MEMBER_REPOSITORY, {
        findByChannelAndUser: async (channelId: string, userId: string) =>
          channelId === cP && userId === 'u-admin' ? { channelId, userId } : null,
        listMembers: async () => [],
        addMember: async (channelId: string, userId: string) => ({ channelId, userId }),
        removeMember: async () => undefined,
      } as never)
      container.registerInstance(MESSAGE_REPOSITORY, {
        findById: byId({
          mA: { id: 'mA', channelId: 'cA', senderId: 'u-admin' },
          mB: { id: 'mB', channelId: 'cA', senderId: 'u-member' },
        }),
        findByChannel: async () => [],
        create: async (data: object) => ({ id: 'new', ...data }),
        update,
      } as never)
      container.registerInstance(COMMENT_REPOSITORY, {
        findById: byId({
          kA: { id: 'kA', taskId: 'tA', authorId: 'u-admin' },
          kB: { id: 'kB', taskId: 'tA', authorId: 'u-member' },
        }),
        update,
      } as never)
      container.registerInstance(ATTACHMENT_REPOSITORY, {
        findById: byId({ aA: { id: 'aA', taskId: 'tA' } }),
      } as never)
      container.registerInstance(TASK_ASSIGNEE_REPOSITORY, {
        add: async (taskId: string, userId: string) => ({ taskId, userId }),
      } as never)
      for (const token of [
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
      { path: '/users', controller: UserController },
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
  beforeEach(() => {
    Container.reset()
    rows = seedRows()
  })

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
    const invite = { email: 'someone@test.com', role: 'admin' }
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

describe('object-level authorization', () => {
  beforeEach(() => {
    Container.reset()
    rows = seedRows()
  })

  it('refuses to add a user from another workspace, as if they did not exist', async () => {
    const api = await makeApp()
    const auth = as('u-admin')
    await api.post('/api/v1/channels/cA/members/u-out').set('Authorization', auth).expect(404)
    await api.post('/api/v1/tasks/tA/assignees/u-out').set('Authorization', auth).expect(404)
    await api
      .put('/api/v1/workspaces/wA/members/u-out')
      .set('Authorization', auth)
      .send({ role: 'admin' })
      .expect(404)
    // Teammates from the same workspace are fine.
    await api.post('/api/v1/channels/cA/members/u-member').set('Authorization', auth).expect(201)
    await api.post('/api/v1/tasks/tA/assignees/u-member').set('Authorization', auth).expect(201)
  })

  it('hides a private channel from workspace members outside it', async () => {
    const api = await makeApp()
    const auth = as('u-member')
    for (const path of [
      `/api/v1/channels/${cP}`,
      `/api/v1/channels/${cP}/members`,
      `/api/v1/messages/channel/${cP}`,
    ]) {
      const res = await api.get(path).set('Authorization', auth)
      expect(res.status, path).toBe(404)
    }
    await api
      .post('/api/v1/messages')
      .set('Authorization', auth)
      .send({ channelId: cP, content: 'hi' })
      .expect(404)
    await api.post(`/api/v1/channels/${cP}/members/u-member`).set('Authorization', auth).expect(404)
    // Its member reads it; a public channel is open to every workspace member.
    await api.get(`/api/v1/channels/${cP}`).set('Authorization', as('u-admin')).expect(200)
    await api.get('/api/v1/messages/channel/cA').set('Authorization', auth).expect(200)
  })

  it('lets only the creator or an admin change a channel or remove others', async () => {
    const api = await makeApp()
    const member = as('u-member')
    await api
      .put('/api/v1/channels/cA')
      .set('Authorization', member)
      .send({ name: 'x' })
      .expect(403)
    await api.delete('/api/v1/channels/cA').set('Authorization', member).expect(403)
    await api.delete('/api/v1/channels/cA/members/u-other').set('Authorization', member).expect(403)
    await api
      .delete('/api/v1/channels/cA/members/u-member')
      .set('Authorization', member)
      .expect(204)
    await api
      .put('/api/v1/channels/cA')
      .set('Authorization', as('u-other'))
      .send({ name: 'x' })
      .expect(200)
    await api
      .put('/api/v1/channels/cA')
      .set('Authorization', as('u-admin'))
      .send({ name: 'x' })
      .expect(200)
    await api.delete('/api/v1/channels/cA').set('Authorization', as('u-admin')).expect(204)
  })

  it('lets only the author or an admin edit a message or comment', async () => {
    const api = await makeApp()
    const other = as('u-other')
    await api
      .put('/api/v1/messages/mB')
      .set('Authorization', other)
      .send({ content: 'x' })
      .expect(403)
    await api
      .put('/api/v1/comments/kB')
      .set('Authorization', other)
      .send({ content: 'x' })
      .expect(403)
    await api
      .put('/api/v1/messages/mB')
      .set('Authorization', as('u-member'))
      .send({ content: 'x' })
      .expect(200)
    await api
      .put('/api/v1/messages/mB')
      .set('Authorization', as('u-admin'))
      .send({ content: 'x' })
      .expect(200)
    await api
      .put('/api/v1/comments/kB')
      .set('Authorization', as('u-admin'))
      .send({ content: 'x' })
      .expect(200)
  })

  it('lets any member edit a task but only the reporter or an admin change projects and delete tasks', async () => {
    const api = await makeApp()
    const member = as('u-member')
    await api.put('/api/v1/tasks/tA').set('Authorization', member).send({ title: 'x' }).expect(200)
    await api.delete('/api/v1/tasks/tA').set('Authorization', member).expect(403)
    await api
      .put('/api/v1/projects/pA')
      .set('Authorization', member)
      .send({ name: 'x' })
      .expect(403)
    await api.delete('/api/v1/projects/pA').set('Authorization', member).expect(403)
    await api
      .put('/api/v1/projects/pA')
      .set('Authorization', as('u-admin'))
      .send({ name: 'x' })
      .expect(200)
  })
})

describe('user visibility', () => {
  beforeEach(() => {
    Container.reset()
    rows = seedRows()
  })

  const ids = (res: { body: { data: { id: string }[] } }) => res.body.data.map((u) => u.id).sort()

  it('lists only the caller and people who share a workspace with them', async () => {
    const api = await makeApp()
    const res = await api.get('/api/v1/users').set('Authorization', as('u-admin')).expect(200)
    expect(ids(res)).toEqual(['u-admin', 'u-member', 'u-other'])
    for (const u of res.body.data) expect(u).not.toHaveProperty('passwordHash')

    const lone = await api.get('/api/v1/users').set('Authorization', as(uLone)).expect(200)
    expect(ids(lone)).toEqual([uLone])
  })

  it('counts the scoped set in the pagination total', async () => {
    const api = await makeApp()
    const res = await api
      .get('/api/v1/users?page=1&limit=1')
      .set('Authorization', as('u-admin'))
      .expect(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.meta.total).toBe(3)
  })

  it('answers a user outside every shared workspace with the same 404 as a missing one', async () => {
    const api = await makeApp()
    const auth = as('u-admin')
    const missing = await api.get(`/api/v1/users/${cP}`).set('Authorization', auth).expect(404)
    const outsider = await api.get('/api/v1/users/u-out').set('Authorization', auth).expect(404)
    expect(outsider.body).toEqual(missing.body)
    await api.get('/api/v1/users/u-member').set('Authorization', auth).expect(200)
    await api.get('/api/v1/users/u-admin').set('Authorization', auth).expect(200)
    await api.get(`/api/v1/users/${uLone}`).set('Authorization', as(uLone)).expect(200)
  })

  it('rejects filters and sorts on anything but public profile fields', async () => {
    const api = await makeApp()
    const auth = as('u-admin')
    for (const qs of [
      'filter=passwordHash:starts:$2',
      'filter=$where:eq:1',
      'filter=isActive:eq:true',
      'filter=user.passwordHash:eq:x',
      'sort=passwordHash:asc',
    ]) {
      const res = await api.get(`/api/v1/users?${qs}`).set('Authorization', auth)
      expect(res.status, qs).toBe(400)
      expect(res.body.data).toBeUndefined()
    }
    await api
      .get('/api/v1/users?filter=firstName:eq:x&sort=email:asc')
      .set('Authorization', auth)
      .expect(200)
  })

  it('answers an invite the same for a registered and an unknown email', async () => {
    const api = await makeApp()
    const auth = as('u-admin')
    const known = await api
      .post('/api/v1/workspaces/wA/members')
      .set('Authorization', auth)
      .send({ email: `${uLone}@test.com` })
      .expect(202)
    const unknown = await api
      .post('/api/v1/workspaces/wA/members')
      .set('Authorization', auth)
      .send({ email: 'nobody@test.com' })
      .expect(202)
    expect(known.body).toEqual(unknown.body)
  })

  it('grants a pending invitee nothing until they accept', async () => {
    const api = await makeApp()
    const admin = as('u-admin')
    const invitee = as(uLone)
    await api
      .post('/api/v1/workspaces/wA/members')
      .set('Authorization', admin)
      .send({ email: `${uLone}@test.com` })
      .expect(202)

    // Pending: neither side sees the other, and the invitee can't reach the workspace.
    await api.get(`/api/v1/users/${uLone}`).set('Authorization', admin).expect(404)
    await api.get('/api/v1/users/u-admin').set('Authorization', invitee).expect(404)
    expect(ids(await api.get('/api/v1/users').set('Authorization', invitee))).toEqual([uLone])
    await api.get('/api/v1/workspaces/wA').set('Authorization', invitee).expect(404)
    await api.post(`/api/v1/tasks/tA/assignees/${uLone}`).set('Authorization', admin).expect(404)

    // Someone else can't accept it for them.
    await api
      .post('/api/v1/workspaces/wA/invite/accept')
      .set('Authorization', as('u-out'))
      .expect(404)
    await api.post('/api/v1/workspaces/wA/invite/accept').set('Authorization', invitee).expect(200)

    await api.get(`/api/v1/users/${uLone}`).set('Authorization', admin).expect(200)
    await api.get('/api/v1/users/u-admin').set('Authorization', invitee).expect(200)
    await api.post(`/api/v1/tasks/tA/assignees/${uLone}`).set('Authorization', admin).expect(201)
    // Accepting twice is a 404, not a second membership.
    await api.post('/api/v1/workspaces/wA/invite/accept').set('Authorization', invitee).expect(404)
  })

  it('drops a declined invite', async () => {
    const api = await makeApp()
    await api
      .post('/api/v1/workspaces/wA/members')
      .set('Authorization', as('u-admin'))
      .send({ email: `${uLone}@test.com` })
      .expect(202)
    await api
      .post('/api/v1/workspaces/wA/invite/decline')
      .set('Authorization', as(uLone))
      .expect(200)
    await api
      .post('/api/v1/workspaces/wA/invite/accept')
      .set('Authorization', as(uLone))
      .expect(404)
    await api.get(`/api/v1/users/${uLone}`).set('Authorization', as('u-admin')).expect(404)
  })
})
