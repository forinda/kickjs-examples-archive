import 'reflect-metadata'
import { sql } from 'drizzle-orm'
import * as schema from './schema'
import { createDb } from './index'

const connectionString = process.env.DATABASE_URL!
if (!connectionString) {
  console.error('DATABASE_URL env variable is required')
  process.exit(1)
}

const { client, db } = createDb(connectionString, 1)

async function reset() {
  console.log('Resetting database...\n')

  // Truncate all tables in reverse dependency order
  const tables = [
    'activities',
    'notifications',
    'messages',
    'channel_members',
    'channels',
    'attachments',
    'comments',
    'task_labels',
    'task_assignees',
    'tasks',
    'labels',
    'projects',
    'workspace_members',
    'workspaces',
    'refresh_tokens',
    'users',
  ]

  for (const table of tables) {
    await db.execute(sql.raw(`TRUNCATE TABLE "${table}" CASCADE`))
    console.log(`Truncated ${table}`)
  }

  console.log('\nAll tables truncated. Run `kick seed` to repopulate.')
  await client.end()
}

reset().catch((err) => {
  console.error('Reset failed:', err)
  process.exit(1)
})
