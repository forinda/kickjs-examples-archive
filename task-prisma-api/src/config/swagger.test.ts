import 'reflect-metadata'
import { afterEach, describe, it } from 'vitest'
import request from 'supertest'
import { Container } from '@forinda/kickjs'
import { createTestApp } from '@forinda/kickjs-testing'
import { swaggerAdapters } from './swagger'

describe('swagger', () => {
  const nodeEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = nodeEnv
    Container.reset()
  })

  it('is not mounted when NODE_ENV is unset', async () => {
    Reflect.deleteProperty(process.env, 'NODE_ENV')
    const { app } = await createTestApp({ modules: [], adapters: swaggerAdapters() })
    await request(app.handle.bind(app)).get('/openapi.json').expect(404)
    await request(app.handle.bind(app)).get('/docs').expect(404)
  })

  it('serves the spec under test', async () => {
    process.env.NODE_ENV = 'test'
    const { app } = await createTestApp({ modules: [], adapters: swaggerAdapters() })
    await request(app.handle.bind(app)).get('/openapi.json').expect(200)
  })
})
