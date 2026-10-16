import { resolve } from 'node:path'
import { defineAdapter } from '@forinda/kickjs'

/** Serves `public/` (the try-it chat page) at `/`. Resolved from the project root, like `.env`. */
export const PublicPageAdapter = defineAdapter({
  name: 'PublicPageAdapter',
  build: () => ({
    beforeMount({ http }) {
      http.serveStatic('/', resolve('public'))
    },
  }),
})
