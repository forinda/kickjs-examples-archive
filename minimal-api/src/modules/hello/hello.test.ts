import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { Container } from '@forinda/kickjs'
import { createTestApp } from '@forinda/kickjs-testing'
import '@/config'
import { HelloModule } from './hello.module'

describe('HelloController', () => {
  beforeEach(() => Container.reset())

  it('GET /api/v1/hello returns a greeting', async () => {
    const { app } = await createTestApp({ modules: [HelloModule()] })
    const res = await request(app.handle.bind(app)).get('/api/v1/hello').expect(200)
    expect(res.body.message).toBe('Hello World from KickJS!')
  })

  it('GET /api/v1/hello/health reports ok', async () => {
    const { app } = await createTestApp({ modules: [HelloModule()] })
    const res = await request(app.handle.bind(app)).get('/api/v1/hello/health').expect(200)
    expect(res.body.status).toBe('ok')
  })

  it('unknown route answers 404 problem details', async () => {
    const { app } = await createTestApp({ modules: [HelloModule()] })
    const res = await request(app.handle.bind(app)).get('/api/v1/nope').expect(404)
    expect(res.body.status).toBe(404)
  })
})
