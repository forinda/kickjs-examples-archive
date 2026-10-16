import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { Container, getEnv } from '@forinda/kickjs'
import { kickDbAdapter } from '@forinda/kickjs-db'
import { createTestApp } from '@forinda/kickjs-testing'
import '@/config'
import { jwtStrategy } from '@/auth'
import { AuthAdapter } from '@/adapters/auth.adapter'
import { migrationAdapter } from '@/db/client'
import { DbAdapter } from '@/adapters/db.adapter'
import { ProjectModule } from './project.module'

async function makeApp() {
  const { app } = await createTestApp({
    modules: [ProjectModule()],
    adapters: [
      DbAdapter(),
      kickDbAdapter({
        migrationAdapter,
        migrationsDir: 'db/migrations',
        migrationsOnBoot: 'apply',
      }),
      AuthAdapter({
        defaultPolicy: 'open',
        strategies: [
          jwtStrategy({
            secret: getEnv('JWT_SECRET'),
            mapPayload: (p) => ({
              id: p.sub!,
              email: p.email,
              roles: [],
              tenants: p.tenants ?? [],
            }),
          }),
        ],
      }),
    ],
  })
  return request(app.handle.bind(app))
}

const bearer = (tenants: string[]) => ({
  Authorization: `Bearer ${jwt.sign({ sub: 'u1', email: 'a@example.test', tenants }, getEnv('JWT_SECRET'))}`,
})
const auth = bearer(['acme', 'globex'])

describe('ProjectController', () => {
  beforeEach(() => Container.reset())

  it('rejects requests without a token', async () => {
    const http = await makeApp()
    await http.get('/api/v1/projects').set('x-tenant', 'acme').expect(401)
  })

  it('answers 404 for an unknown tenant', async () => {
    const http = await makeApp()
    await http.get('/api/v1/projects').set('x-tenant', 'nope').set(auth).expect(404)
  })

  it('answers a tenant the user does not belong to like an unknown one (404, no enumeration)', async () => {
    const http = await makeApp()
    const acmeOnly = bearer(['acme'])
    await http.get('/api/v1/projects').set('x-tenant', 'acme').set(acmeOnly).expect(200)
    await http.get('/api/v1/projects').set('x-tenant', 'globex').set(acmeOnly).expect(404)
    await http
      .post('/api/v1/projects')
      .set('Host', 'globex.localhost')
      .set(acmeOnly)
      .send({ title: 'Not mine' })
      .expect(404)
  })

  it("keeps each tenant's projects apart", async () => {
    const http = await makeApp()
    const created = await http
      .post('/api/v1/projects')
      .set('x-tenant', 'acme')
      .set(auth)
      .send({ title: 'Rocket skates' })
      .expect(201)
    expect(created.body.workspaceId).toBe('tenant-acme')

    const acme = await http.get('/api/v1/projects').set('x-tenant', 'acme').set(auth).expect(200)
    expect(acme.body.tenant).toBe('Acme Corp')
    expect(acme.body.projects.map((p: { title: string }) => p.title)).toEqual(['Rocket skates'])

    const globex = await http
      .get('/api/v1/projects')
      .set('Host', 'globex.localhost')
      .set(auth)
      .expect(200)
    expect(globex.body.projects).toEqual([])
  })

  it('imports idempotently: a title the workspace has is skipped, and every row comes back', async () => {
    const http = await makeApp()
    const send = (titles: string[]) =>
      http
        .post('/api/v1/projects/import')
        .set('x-tenant', 'acme')
        .set(auth)
        .send({ projects: titles.map((title) => ({ title })) })
        .expect(200)
    const first = await send(['Anvil', 'Magnet'])
    const again = await send(['Magnet', 'Tornado seeds'])
    const magnet = (rows: { id: string; title: string }[]) =>
      rows.find((p) => p.title === 'Magnet')!.id
    expect(magnet(again.body.projects)).toBe(magnet(first.body.projects))

    const acme = await http.get('/api/v1/projects').set('x-tenant', 'acme').set(auth).expect(200)
    const titles = acme.body.projects.map((p: { title: string }) => p.title)
    expect(titles).toEqual(expect.arrayContaining(['Anvil', 'Magnet', 'Tornado seeds']))
    expect(titles.filter((t: string) => t === 'Magnet')).toHaveLength(1)
    // Another workspace may use the same titles.
    const globex = await http
      .post('/api/v1/projects/import')
      .set('x-tenant', 'globex')
      .set(auth)
      .send({ projects: [{ title: 'Anvil' }] })
      .expect(200)
    expect(globex.body.projects[0].workspaceId).toBe('tenant-globex')
  })
})
