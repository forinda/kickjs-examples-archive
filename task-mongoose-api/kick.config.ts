import { defineConfig } from '@forinda/kickjs-cli'

export default defineConfig({
  pattern: 'ddd',
  runtime: 'express',
  modules: {
    dir: 'src/modules',
    pluralize: true,
  },

  typegen: {
    schemaValidator: 'kickjs-schema',
  },

  commands: [
    { name: 'seed', description: 'Populate the database with sample data', steps: 'tsx src/db/seed.ts' },
    {
      name: 'db:reset',
      description: 'Drop the database and reseed',
      steps: ['tsx src/db/reset.ts', 'tsx src/db/seed.ts'],
    },
    { name: 'lint', description: 'Lint with oxlint', steps: 'oxlint src/' },
    { name: 'format', description: 'Format code with oxfmt', steps: 'oxfmt src/' },
  ],
})
