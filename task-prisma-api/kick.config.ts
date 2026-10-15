import { defineConfig } from '@forinda/kickjs-cli'

export default defineConfig({
  pattern: 'rest',
  runtime: 'express',
  modules: {
    dir: 'src/modules',
    pluralize: true,
  },

  typegen: {
    schemaValidator: 'kickjs-schema',
  },

  commands: [
    { name: 'lint', description: 'Lint with oxlint', steps: 'oxlint src/' },
    { name: 'format', description: 'Format code with oxfmt', steps: 'oxfmt src/' },
    { name: 'db:reset', description: 'Reset database', steps: 'prisma migrate reset --force' },
  ],
})
