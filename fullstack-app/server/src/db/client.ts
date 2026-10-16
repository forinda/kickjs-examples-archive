// Registers the env schema — `kick db` loads this file without src/index.ts.
// Relative on purpose: kick.config.ts loads this file outside Vite, where the
// `@/` alias does not resolve.
import '../config'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import { getEnv } from '@forinda/kickjs'
import { createDbClient } from '@forinda/kickjs-db'
import { sqliteAdapter, sqliteDialect } from '@forinda/kickjs-db/sqlite'
import * as schema from './schema'

const file = getEnv('DB_FILE')
if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true })

/** One SQLite handle serves the query client and migrations (app boot and `kick db`). */
export const database = new Database(file)

export const db = createDbClient({ schema, dialect: sqliteDialect({ database }) })

export const migrationAdapter = sqliteAdapter({ database })

export type AppDb = typeof db
