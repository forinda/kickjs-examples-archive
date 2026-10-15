import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { Container } from '@forinda/kickjs'
import { createTestApp } from '@forinda/kickjs-testing'
import { env } from '@/config'
import { AuthAdapter, jwtStrategy } from '@/auth'
import { LoadTenant } from '@/contributors/tenant.context'
import { TenantDbPlugin } from '@/plugins/tenant-db.plugin'
import { ProjectModule } from './project.module'

async function makeApp() {
  const { app } = await createTestApp({
    modules: [ProjectModule()],
    contributors: [LoadTenant.registration],
    plugins: [TenantDbPlugin()],
    adapters: [
      AuthAdapter({
        defaultPolicy: 'open',
        strategies: [
          jwtStrategy({
            secret: env.JWT_SECRET,
            mapPayload: (p) => ({ id: p.sub!, email: p.email, roles: [] }),
          }),
        ],
      }),
    ],
  })
  return request(app.handle.bind(app))
}

describe('ProjectController', () => {
  beforeEach(() => Container.reset())

  it('rejects requests without a token', async () => {
    const http = await makeApp()
    await http.get('/api/v1/projects').set('Host', 'acme.localhost').expect(401)
  })

  it('lists projects for the tenant resolved from the subdomain', async () => {
    const http = await makeApp()
    const token = jwt.sign({ sub: 'u1', email: 'a@acme.test' }, env.JWT_SECRET)
    const res = await http
      .get('/api/v1/projects')
      .set('Host', 'acme.localhost')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(res.body.tenant).toBe('Acme Corp')
    expect(res.body.user).toBe('a@acme.test')
    expect(res.body.projects[0].note).toContain('tenant-acme')
  })
})
