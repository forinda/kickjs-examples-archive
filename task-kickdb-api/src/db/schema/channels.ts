import { table, uuid, varchar, text, timestamp, unique, index } from '@forinda/kickjs-db'

import { workspaces } from './workspaces'
import { projects } from './projects'
import { users } from './users'
import { channelType } from './enums'

export const channels = table(
  'channels',
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid().references(() => projects.id, { onDelete: 'set_null' }),
    name: varchar(100).notNull(),
    description: text(),
    type: channelType().notNull().default('public'),
    createdById: uuid()
      .notNull()
      .references(() => users.id),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (t) => ({
    nameUnique: unique('channels_workspace_name_unique').on(t.workspaceId, t.name),
    workspaceIdx: index('channels_workspace_idx').on(t.workspaceId),
    projectIdx: index('channels_project_idx').on(t.projectId),
  }),
)
