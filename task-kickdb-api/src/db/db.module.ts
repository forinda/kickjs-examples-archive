import { defineModule } from '@forinda/kickjs'
import { DB_PRIMARY } from '@forinda/kickjs-db'
import { dbClient } from './client'

/** Registers the query client. No HTTP surface — mount it before the modules that inject DB_PRIMARY. */
export const DbModule = defineModule({
  name: 'DbModule',
  build: () => ({
    register(container) {
      container.registerFactory(DB_PRIMARY, () => dbClient)
    },
    routes: () => null,
  }),
})
