// Drizzle wired directly (BYO) — replaces the removed @forinda/kickjs-drizzle.
// The connection's lifecycle lives in DrizzleAdapter (@/adapters/drizzle.adapter).
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { createToken } from '@forinda/kickjs'
import * as schema from './schema'

export function createDb(url: string, max = 10) {
  const client = postgres(url, { max })
  return { client, db: drizzle(client, { schema }) }
}

export type AppDatabase = ReturnType<typeof createDb>['db']

/** Inject with `@Inject(DRIZZLE_DB)`. */
export const DRIZZLE_DB = createToken<AppDatabase>('app/Drizzle/db')
