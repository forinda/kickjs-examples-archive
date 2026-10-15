import { defineModule } from '@forinda/kickjs'
import { PRISMA_CLIENT } from '@/db/prisma'
import { USER_REPOSITORY, createUserRepository } from './user.repository'
import { UserController } from './user.controller'

export const UserModule = defineModule({
  name: 'UserModule',
  build: () => ({
    register(container) {
      container.registerFactory(USER_REPOSITORY, () =>
        createUserRepository(container.resolve(PRISMA_CLIENT)),
      )
    },

    /**
     * Declare HTTP routes for this module.
     * The path is prefixed with the global apiPrefix and version (e.g. /api/v1/users).
     * Passing 'controller' enables automatic OpenAPI spec generation via SwaggerAdapter.
     */
    routes() {
      return {
        path: '/users',
        controller: UserController,
      }
    },
  }),
})
