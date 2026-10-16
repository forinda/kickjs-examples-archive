import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { Container, Controller, Get, defineModule, type RequestContext } from '@forinda/kickjs'
import { createTestApp } from '@forinda/kickjs-testing'
import { Public, jwtStrategy } from '@/auth'
import { AuthAdapter } from '@/adapters/auth.adapter'
import { RequireRole } from '@/guards/require-role.guard'

const SECRET = 'test-secret-that-is-at-least-32-chars-long!'

@Controller()
class ProbeController {
  @Get('/me')
  me(ctx: RequestContext) {
    return { data: ctx.get('user') }
  }

  @Public
  @Get('/health')
  health() {
    return { status: 'ok' }
  }

  @RequireRole({ roles: ['superadmin'] })
  @Get('/admin')
  admin() {
    return { ok: true }
  }
}

const ProbeModule = defineModule({
  name: 'ProbeModule',
  build: () => ({ routes: () => ({ path: '/probe', controller: ProbeController }) }),
})

async function makeApp() {
  const { app } = await createTestApp({
    modules: [ProbeModule()],
    health: { flags: ['auth.public'] }, // as in src/index.ts
    adapters: [
      AuthAdapter({
        defaultPolicy: 'protected',
        strategies: [
          jwtStrategy({
            secret: SECRET,
            mapPayload: (p) => ({ id: p.sub!, email: p.email, globalRole: p.globalRole ?? 'user' }),
          }),
        ],
      }),
    ],
  })
  return request(app.handle.bind(app))
}

const token = (claims: object, expiresIn: jwt.SignOptions['expiresIn'] = '1h') =>
  `Bearer ${jwt.sign({ sub: 'u1', email: 'alice@test.com', ...claims }, SECRET, { expiresIn })}`

describe('BYO auth (src/auth)', () => {
  beforeEach(() => Container.reset())

  it('rejects requests without a token', async () => {
    const http = await makeApp()
    await http.get('/api/v1/probe/me').expect(401)
  })

  it('rejects invalid and expired tokens', async () => {
    const http = await makeApp()
    await http.get('/api/v1/probe/me').set('Authorization', 'Bearer invalid.token').expect(401)
    await http.get('/api/v1/probe/me').set('Authorization', token({}, '-1s')).expect(401)
  })

  it('exposes the user for a valid token', async () => {
    const http = await makeApp()
    const res = await http.get('/api/v1/probe/me').set('Authorization', token({})).expect(200)
    expect(res.body.data).toEqual({ id: 'u1', email: 'alice@test.com', globalRole: 'user' })
  })

  it('lets @Public routes through without a token', async () => {
    const http = await makeApp()
    const res = await http.get('/api/v1/probe/health').expect(200)
    expect(res.body.status).toBe('ok')
  })

  it('lets the /health probes through without a token, by their mount flag', async () => {
    const http = await makeApp()
    await http.get('/health/live').expect(200)
    await http.get('/health/ready').expect(200)
    await http.get('/api/v1/probe/me').expect(401)
  })

  it('@RequireRole answers 403 for the wrong role and 200 for the right one', async () => {
    const http = await makeApp()
    await http.get('/api/v1/probe/admin').set('Authorization', token({})).expect(403)
    await http
      .get('/api/v1/probe/admin')
      .set('Authorization', token({ globalRole: 'superadmin' }))
      .expect(200)
  })
})
