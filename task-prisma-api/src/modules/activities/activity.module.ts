import { defineModule } from '@forinda/kickjs'
import { PRISMA_CLIENT } from '@/db/prisma'
import { ACTIVITY_REPOSITORY, createActivityRepository } from './activity.repository'
import { ActivityController } from './activity.controller'

export const ActivityModule = defineModule({
  name: 'ActivityModule',
  build: () => ({
    /**
     * Register module dependencies in the DI container.
     * Bind repository interface tokens to their implementations here.
     * To swap implementations (e.g. in-memory -> Prisma), change the factory target.
     */
    register(container) {
      container.registerFactory(ACTIVITY_REPOSITORY, () =>
        createActivityRepository(container.resolve(PRISMA_CLIENT)),
      )
    },

    /**
     * Declare HTTP routes for this module.
     * The path is prefixed with the global apiPrefix and version (e.g. /api/v1/activities).
     * Passing 'controller' enables automatic OpenAPI spec generation via SwaggerAdapter.
     */
    routes() {
      return {
        path: '/activities',
        controller: ActivityController,
      }
    },
  }),
})
