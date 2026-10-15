import { defineConfig } from '@forinda/kickjs-cli'
import { dbCliPlugin } from '@forinda/kickjs-db/cli'

export default defineConfig({
  pattern: 'rest',
  runtime: 'express',
  modules: {
    dir: 'src/modules',
    pluralize: true,
  },

  // `kick db generate | migrate | status` — runs on the app's own SQLite handle.
  plugins: [dbCliPlugin],
  db: {
    schemaPath: 'src/db/schema/index.ts',
    migrationsDir: 'db/migrations',
    dialect: 'sqlite',
    adapter: async () => (await import('./src/db/client')).migrationAdapter,
  },

  typegen: {
    schemaValidator: 'kickjs-schema',
  },

  commands: [
    { name: 'lint', description: 'Lint with oxlint', steps: 'oxlint src/' },
    { name: 'format', description: 'Format code with oxfmt', steps: 'oxfmt src/' },
  ],
})
