// Drizzle wired directly (BYO) — replaces the removed @forinda/kickjs-drizzle.
// The connection's lifecycle lives in DrizzleAdapter: connect in beforeStart,
// ping in onHealthCheck (feeds GET /health/ready), close in shutdown.
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql } from 'drizzle-orm'
import { createToken, defineAdapter, Inject } from '@forinda/kickjs'
import * as schema from './schema'

export function createDb(url: string, max = 10) {
  const client = postgres(url, { max })
  return { client, db: drizzle(client, { schema }) }
}

export type AppDatabase = ReturnType<typeof createDb>['db']

/** Inject with `@Inject(DRIZZLE_DB)`. */
export const DRIZZLE_DB = createToken<AppDatabase>('app/Drizzle/db')

export const DrizzleAdapter = defineAdapter<{ url: string }>({
  name: 'DrizzleAdapter',
  build: (opts) => {
    let conn: ReturnType<typeof createDb> | undefined
    return {
      async beforeStart({ container }) {
        conn = createDb(opts.url)
        await conn.db.execute(sql`select 1`) // fail fast on a bad DATABASE_URL
        container.registerInstance(DRIZZLE_DB, conn.db)
      },
      async onHealthCheck() {
        try {
          await conn!.db.execute(sql`select 1`)
          return { name: 'postgres', status: 'up' as const }
        } catch {
          return { name: 'postgres', status: 'down' as const }
        }
      },
      async shutdown() {
        await conn?.client.end()
      },
    }
  },
})
