import { defineConfig } from '@forinda/kickjs-cli'
import { dbCliPlugin } from '@forinda/kickjs-db/cli'

export default defineConfig({
  // `kick db generate <name>` diffs src/db/schema.ts against the latest
  // snapshot and writes up.sql + down.sql + snapshot.json under db/migrations/.
  plugins: [dbCliPlugin],
  db: {
    schemaPath: 'src/db/schema.ts',
    migrationsDir: 'db/migrations',
    dialect: 'postgres',
  },
})
