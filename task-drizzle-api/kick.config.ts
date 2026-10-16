import { defineConfig } from '@forinda/kickjs-cli'

export default defineConfig({
  pattern: 'rest',
  runtime: 'express',
  modules: {
    dir: 'src/modules',
    pluralize: true,
  },

  // Mail templates live in src/templates/mails in dev; `kick build` copies
  // them to dist/ and `assets.mails.welcome()` resolves the right path.
  assetMap: {
    mails: { src: 'src/templates/mails', glob: '**/*.ejs' },
  },

  typegen: {
    schemaValidator: 'kickjs-schema',
  },

  commands: [
    { name: 'lint', description: 'Lint with oxlint', steps: 'oxlint src/' },
    { name: 'format', description: 'Format code with oxfmt', steps: 'oxfmt src/' },
  ],
})
