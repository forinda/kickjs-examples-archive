import { beforeAll, describe, expect, it } from 'vitest'
import { migrateLatest } from '@forinda/kickjs-db'
import '@/config'
import { db, migrationAdapter } from './client'
import { tenancy } from './tenancy'

const owners = () =>
  tenancy.bypass(
    () => db.selectFrom('projects').select(['title', 'workspaceId']).orderBy('title').execute(),
    { reason: 'test' },
  )

describe("'column' tenancy on workspaceId", () => {
  beforeAll(async () => {
    await migrateLatest({ adapter: migrationAdapter, migrationsDir: 'db/migrations' })
    await tenancy.run('tenant-acme', () =>
      db.insertInto('projects').values({ title: 'Acme plan' }).execute(),
    )
    await tenancy.run('tenant-globex', () =>
      db.insertInto('projects').values({ title: 'Globex plan' }).execute(),
    )
  })

  it('stamps and filters by the workspace column', async () => {
    expect(await owners()).toEqual([
      { title: 'Acme plan', workspaceId: 'tenant-acme' },
      { title: 'Globex plan', workspaceId: 'tenant-globex' },
    ])
    const seen = await tenancy.run('tenant-acme', () =>
      db.selectFrom('projects').select('title').execute(),
    )
    expect(seen).toEqual([{ title: 'Acme plan' }])
  })

  it("can't hand a project to another workspace", async () => {
    await expect(
      tenancy.run('tenant-acme', () =>
        db.updateTable('projects').set({ workspaceId: 'tenant-globex' }).execute(),
      ),
    ).rejects.toThrow(/can't write projects.workspaceId/)
    expect((await owners()).map((p) => p.workspaceId)).toEqual(['tenant-acme', 'tenant-globex'])
  })

  it('filters the table however a query spells it', async () => {
    const seen = await tenancy.run('tenant-acme', () =>
      db
        .selectFrom('main.projects' as 'projects')
        .select('title')
        .execute(),
    )
    expect(seen).toEqual([{ title: 'Acme plan' }])
  })
})
