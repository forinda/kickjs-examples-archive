import { pgTable, uuid, timestamp, unique } from 'drizzle-orm/pg-core'
import { membershipStatusEnum, workspaceRoleEnum } from './enums'
import { users } from './users'
import { workspaces } from './workspaces'

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .references(() => workspaces.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    role: workspaceRoleEnum('role').default('member').notNull(),
    // Only accepted rows grant access; existing rows become accepted via the default.
    status: membershipStatusEnum('status').default('accepted').notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (t) => [unique().on(t.workspaceId, t.userId)],
)
