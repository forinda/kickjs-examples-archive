// One pg.Pool serves both the query client (registered under DB_PRIMARY by
// DbAdapter) and the migration adapter kickDbAdapter uses on boot.
import { Pool } from 'pg'
import { getEnv } from '@forinda/kickjs'
import { createDbClient } from '@forinda/kickjs-db'
import { pgAdapter, pgDialect } from '@forinda/kickjs-db/pg'
// Side effect: registers the env schema (tests import this file without src/index.ts).
import '@/config'
import * as schema from './schema'

export const pool = new Pool({ connectionString: getEnv('DATABASE_URL') })

// SchemaToTypes<typeof schema> is inferred end-to-end; `kick typegen` also
// widens the bare `KickDbClient` type to this shape (.kickjs/types/kick__db.d.ts).
export const dbClient = createDbClient({
  schema,
  dialect: pgDialect({ pool }),
  events: true,
  // A failed query's stack shows the line that built it, not only the driver's.
  asyncStackTraces: getEnv('NODE_ENV') !== 'production',
})

// The pool is shared, so the migration adapter leaves it open — DbAdapter ends it.
export const migrationAdapter = pgAdapter({ pool })

export type Db = typeof dbClient

export { schema }
