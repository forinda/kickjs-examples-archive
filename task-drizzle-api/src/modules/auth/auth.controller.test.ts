import 'reflect-metadata'
import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import {
  Container,
  Controller,
  Post,
  Get,
  Inject,
  Middleware,
  HttpException,
  buildRoutes,
  type MiddlewareHandler,
  type RequestContext,
} from '@forinda/kickjs'
import { createTestApp, createTestModule } from '@forinda/kickjs-testing'
import type {
  NewRefreshToken,
  RefreshToken,
  RefreshTokenRepository,
} from './refresh-token.repository'
import {
  USER_REPOSITORY,
  type NewUser,
  type UserRepository,
  type UserWithCredentials as User,
} from '@/modules/users/user.repository'

// ── Test JWT secret ──────────────────────────────────────────────────
const TEST_JWT_SECRET = 'test-secret-that-is-at-least-32-chars-long!'

// Stub env vars so they don't leak to other tests
beforeAll(() => {
  vi.stubEnv('JWT_SECRET', TEST_JWT_SECRET)
  vi.stubEnv('JWT_REFRESH_SECRET', TEST_JWT_SECRET)
  vi.stubEnv('JWT_ACCESS_EXPIRES_IN', '15m')
  vi.stubEnv('JWT_REFRESH_EXPIRES_IN', '7d')
  vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost/test')
})

afterAll(() => {
  vi.unstubAllEnvs()
})

// ── In-memory repositories ───────────────────────────────────────────

class InMemoryUserRepository implements UserRepository {
  private users: User[] = []

  async findById(id: string) {
    return this.users.find((u) => u.id === id) ?? null
  }

  async findVisibleById(id: string) {
    return this.findById(id)
  }

  async findByEmail(email: string) {
    return this.users.find((u) => u.email === email) ?? null
  }

  async findAll() {
    return this.users
  }

  async findPaginated() {
    return { data: this.users, total: this.users.length }
  }

  async create(dto: NewUser) {
    const user: User = {
      id: `u${this.users.length + 1}`,
      email: dto.email,
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      passwordHash: dto.passwordHash,
      globalRole: dto.globalRole ?? 'user',
      isActive: true,
      avatarUrl: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.users.push(user)
    return user
  }

  async update(id: string, dto: Partial<NewUser>) {
    const user = this.users.find((u) => u.id === id)
    if (!user) throw new Error('Not found')
    Object.assign(user, dto, { updatedAt: new Date() })
    return user
  }

  async delete(id: string) {
    this.users = this.users.filter((u) => u.id !== id)
  }
}

class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  private tokens: RefreshToken[] = []

  async create(data: NewRefreshToken) {
    const token: RefreshToken = {
      id: `rt${this.tokens.length + 1}`,
      userId: data.userId,
      token: data.token,
      expiresAt: data.expiresAt,
      createdAt: new Date(),
    }
    this.tokens.push(token)
    return token
  }

  async findByToken(token: string) {
    return this.tokens.find((t) => t.token === token) ?? null
  }

  async deleteByToken(token: string) {
    const len = this.tokens.length
    this.tokens = this.tokens.filter((t) => t.token !== token)
    return this.tokens.length < len
  }

  async deleteByUserId(userId: string) {
    this.tokens = this.tokens.filter((t) => t.userId !== userId)
  }

  async deleteExpired() {
    const now = new Date()
    const len = this.tokens.length
    this.tokens = this.tokens.filter((t) => t.expiresAt > now)
    return len - this.tokens.length
  }
}

// ── Test auth middleware (same logic as the real one) ─────────────────

const testAuthMiddleware: MiddlewareHandler = (ctx: RequestContext, next) => {
  const header = ctx.req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    throw HttpException.unauthorized('Missing or invalid authorization header')
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, TEST_JWT_SECRET) as jwt.JwtPayload
    ctx.set('user', {
      id: payload.sub!,
      email: payload.email as string,
      globalRole: payload.globalRole as string,
    })
  } catch {
    throw HttpException.unauthorized('Invalid or expired token')
  }
  next()
}

// ── Test controllers ─────────────────────────────────────────────────

@Controller()
class TestProtectedController {
  @Get('/')
  @Middleware(testAuthMiddleware)
  async getProfile(ctx: RequestContext) {
    const user = ctx.get('user')
    return { data: user }
  }
}

@Controller()
class TestPublicController {
  @Get('/')
  async health(ctx: RequestContext) {
    return { status: 'ok' }
  }
}

// ── Tests ────────────────────────────────────────────────────────────

describe('Auth middleware', () => {
  beforeEach(() => Container.reset())

  function buildProtectedModule() {
    return createTestModule({
      register: (c) => c.register(TestProtectedController, TestProtectedController),
      routes: () => ({
        path: '/protected',
        router: buildRoutes(TestProtectedController),
        controller: TestProtectedController,
      }),
    })
  }

  it('rejects requests without Authorization header', async () => {
    const { app } = await createTestApp({ modules: [buildProtectedModule()] })

    const res = await request(app.handle.bind(app)).get('/api/v1/protected').expect(401)
    expect(res.body.detail).toMatch(/Missing or invalid/)
  })

  it('rejects requests with invalid token', async () => {
    const { app } = await createTestApp({ modules: [buildProtectedModule()] })

    const res = await request(app.handle.bind(app))
      .get('/api/v1/protected')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401)

    expect(res.body.detail).toMatch(/Invalid or expired/)
  })

  it('accepts requests with valid JWT and exposes user', async () => {
    const { app } = await createTestApp({ modules: [buildProtectedModule()] })

    const token = jwt.sign(
      { sub: 'u1', email: 'alice@test.com', globalRole: 'user' },
      TEST_JWT_SECRET,
      { expiresIn: '1h' },
    )

    const res = await request(app.handle.bind(app))
      .get('/api/v1/protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.data.id).toBe('u1')
    expect(res.body.data.email).toBe('alice@test.com')
  })

  it('rejects expired tokens', async () => {
    const { app } = await createTestApp({ modules: [buildProtectedModule()] })

    const token = jwt.sign(
      { sub: 'u1', email: 'alice@test.com', globalRole: 'user' },
      TEST_JWT_SECRET,
      { expiresIn: '-1s' }, // already expired
    )

    await request(app.handle.bind(app))
      .get('/api/v1/protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(401)
  })

  it('public routes work without auth', async () => {
    const PublicModule = createTestModule({
      register: (c) => c.register(TestPublicController, TestPublicController),
      routes: () => ({
        path: '/health',
        router: buildRoutes(TestPublicController),
        controller: TestPublicController,
      }),
    })

    const { app } = await createTestApp({ modules: [PublicModule] })

    const res = await request(app.handle.bind(app)).get('/api/v1/health').expect(200)
    expect(res.body.status).toBe('ok')
  })
})
