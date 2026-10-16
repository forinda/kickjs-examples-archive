import { index, table, tenantKey, text, timestamp, unique, uuid, varchar } from '@forinda/kickjs-db'
import { tenancy } from './tenancy'

/** Tenant registry — not tenanted itself. Seeded by the `seed_tenants` migration. */
export const tenants = table('tenants', {
  id: varchar(64).primaryKey(),
  name: varchar(120).notNull(),
  subdomain: varchar(63).notNull().unique(),
})

export const projects = table(
  'projects',
  {
    id: uuid().primaryKey().defaultRandom(),
    // Marks the table tenanted. Named and typed like the registry's key: a
    // varchar(64) workspace slug, not the default text `tenantId`.
    workspaceId: tenantKey(tenancy, varchar(64)),
    title: varchar(200).notNull(),
    description: text(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdx: index('projects_workspace_idx').on(t.workspaceId),
    // A title is unique within a workspace — the key `import` skips duplicates by.
    workspaceTitle: unique('projects_workspace_title_unique').on(t.workspaceId, t.title),
  }),
)
