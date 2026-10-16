// Owns the Drizzle connection's lifecycle: connect in beforeStart, ping in
// onHealthCheck (feeds GET /health/ready), close in shutdown.
import { sql } from 'drizzle-orm'
import { defineAdapter } from '@forinda/kickjs'
import { createDb, DRIZZLE_DB } from '@/db'

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
