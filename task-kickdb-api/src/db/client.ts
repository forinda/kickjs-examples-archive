// One pg.Pool serves both the query client (registered under DB_PRIMARY by
// DbAdapter) and the migration adapter kickDbAdapter uses on boot.
import { Pool } from 'pg'
import { createDbClient } from '@forinda/kickjs-db'
import { pgAdapter, pgDialect } from '@forinda/kickjs-db/pg'
import { env } from '../config'
import * as schema from './schema'

export const pool = new Pool({ connectionString: env.DATABASE_URL })

// SchemaToTypes<typeof schema> is inferred end-to-end; `kick typegen` also
// widens the bare `KickDbClient` type to this shape (.kickjs/types/kick__db.d.ts).
export const dbClient = createDbClient({
  schema,
  dialect: pgDialect({ pool }),
  events: true,
})

// The pool is shared, so the migration adapter leaves it open — DbAdapter ends it.
export const migrationAdapter = pgAdapter({ pool })

export type Db = typeof dbClient

export { schema }
