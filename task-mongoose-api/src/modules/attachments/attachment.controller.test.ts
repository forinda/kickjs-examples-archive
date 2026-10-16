import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { Container, defineModule } from '@forinda/kickjs'
import { createTestApp } from '@forinda/kickjs-testing'
import { jwtStrategy } from '@/auth'
import { AuthAdapter } from '@/adapters/auth.adapter'
import { TASK_REPOSITORY } from '@/modules/tasks/task.repository'
import { WORKSPACE_MEMBER_REPOSITORY } from '@/modules/workspaces/workspace-member.repository'
import { AttachmentsController } from './attachment.controller'
import { ATTACHMENT_REPOSITORY } from './attachment.repository'

const SECRET = 'test-secret-that-is-at-least-32-chars-long!'

// Attachment a1 belongs to task t1 in workspace ws1; only u1 is a member of ws1.
const attachment = {
  _id: 'a1',
  taskId: 't1',
  fileName: 'spec.pdf',
  fileSize: 3,
  mimeType: 'application/pdf',
  base64Data: Buffer.from('pdf').toString('base64'),
  createdAt: new Date(),
}

const TestModule = defineModule({
  name: 'AttachmentsTestModule',
  build: () => ({
    register(container) {
      container.registerInstance(ATTACHMENT_REPOSITORY, {
        findById: async (id: string) => (id === 'a1' ? attachment : null),
      } as never)
      container.registerInstance(TASK_REPOSITORY, {
        findById: async (id: string) => (id === 't1' ? { _id: 't1', workspaceId: 'ws1' } : null),
      } as never)
      container.registerInstance(WORKSPACE_MEMBER_REPOSITORY, {
        findByUserAndWorkspace: async (userId: string, workspaceId: string) =>
          userId === 'u1' && workspaceId === 'ws1' ? { role: 'member' } : null,
      } as never)
    },
    routes: () => ({ path: '/', controller: AttachmentsController }),
  }),
})

const token = (sub: string) => `Bearer ${jwt.sign({ sub, email: `${sub}@test.com` }, SECRET)}`

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

describe('GET /attachments/:attachmentId', () => {
  beforeEach(() => Container.reset())

  it('returns the attachment to a member of its workspace', async () => {
    const api = await makeApp()
    const res = await api
      .get('/api/v1/attachments/a1')
      .set('Authorization', token('u1'))
      .expect(200)
    expect(res.body.data.fileName).toBe('spec.pdf')
  })

  it('answers a non-member with the same 404 as a missing attachment', async () => {
    const api = await makeApp()
    const missing = await api
      .get('/api/v1/attachments/nope')
      .set('Authorization', token('u1'))
      .expect(404)
    const foreign = await api
      .get('/api/v1/attachments/a1')
      .set('Authorization', token('u2'))
      .expect(404)
    expect(foreign.body).toEqual(missing.body)
  })

  it('applies to download as well', async () => {
    const api = await makeApp()
    await api.get('/api/v1/attachments/a1/download').set('Authorization', token('u2')).expect(404)
  })
})
