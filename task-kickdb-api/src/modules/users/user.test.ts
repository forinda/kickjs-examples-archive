import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { Container, getEnv } from '@forinda/kickjs'
import { createTestApp } from '@forinda/kickjs-testing'
import '@/config'
import { DbAdapter } from '@/adapters/db.adapter'
import { TaskModule } from '@/modules/tasks/task.module'
import { UserModule } from './user.module'

async function makeApp() {
  const { app } = await createTestApp({
    modules: [UserModule(), TaskModule()],
    adapters: [DbAdapter()],
  })
  return request(app.handle.bind(app))
}

describe('task-kickdb-api', () => {
  beforeEach(() => Container.reset())

  it('GET /tasks without workspaceId answers 400 (no database needed)', async () => {
    const http = await makeApp()
    await http.get('/api/v1/tasks').expect(400)
  })

  // Needs a migrated Postgres: set DATABASE_URL in .env.test, then `pnpm db:migrate`.
  it.skipIf(!getEnv('DATABASE_URL'))('creates a user and reads it back', async () => {
    const http = await makeApp()
    const email = `ada+${Date.now()}@example.com`
    const created = await http
      .post('/api/v1/users')
      .send({ email, passwordHash: 'x', firstName: 'Ada', lastName: 'Lovelace' })
      .expect(201)
    const res = await http.get(`/api/v1/users/${created.body.id}`).expect(200)
    expect(res.body.email).toBe(email)
  })
})
