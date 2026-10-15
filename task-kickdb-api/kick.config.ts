import { defineConfig } from '@forinda/kickjs-cli'
import { dbCliPlugin } from '@forinda/kickjs-db/cli'

export default defineConfig({
  pattern: 'rest',
  runtime: 'express',
  modules: {
    dir: 'src/modules',
    pluralize: true,
  },

  // `kick db generate | migrate | status | …` — the CLI connects with
  // DATABASE_URL (read from .env) on Postgres.
  plugins: [dbCliPlugin],
  db: {
    // Explicit `/index.ts` — Node's ESM loader doesn't resolve directory imports.
    schemaPath: 'src/db/schema/index.ts',
    migrationsDir: 'db/migrations',
    dialect: 'postgres',
  },

  typegen: {
    schemaValidator: 'kickjs-schema',
  },

  commands: [
    { name: 'lint', description: 'Lint with oxlint', steps: 'oxlint src/' },
    { name: 'format', description: 'Format code with oxfmt', steps: 'oxfmt src/' },
  ],
})
