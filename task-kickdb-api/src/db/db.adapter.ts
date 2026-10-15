import { defineAdapter } from '@forinda/kickjs'
import { DB_PRIMARY } from '@forinda/kickjs-db'
import { dbClient, pool } from './client'

/**
 * Owns the Postgres pool's lifecycle: registers the query client under
 * DB_PRIMARY, answers `GET /health/ready` with a `SELECT 1`, and drains the
 * pool on shutdown. (`new Pool()` in client.ts opens no connection by itself.)
 */
export const DbAdapter = defineAdapter({
  name: 'DbAdapter',
  build: () => ({
    beforeStart: ({ container }) => {
      container.registerInstance(DB_PRIMARY, dbClient)
    },
    onHealthCheck: async () => {
      try {
        await pool.query('SELECT 1')
        return { name: 'postgres', status: 'up' as const }
      } catch {
        return { name: 'postgres', status: 'down' as const }
      }
    },
    shutdown: async () => {
      await pool.end()
    },
  }),
})
