import { defineModule } from '@forinda/kickjs'
import { PRISMA_CLIENT } from '@/db/prisma'
import { NOTIFICATION_REPOSITORY, createNotificationRepository } from './notification.repository'
import { NotificationController } from './notification.controller'

export const NotificationModule = defineModule({
  name: 'NotificationModule',
  build: () => ({
    /**
     * Register module dependencies in the DI container.
     * Bind repository interface tokens to their implementations here.
     * To swap implementations (e.g. in-memory -> Prisma), change the factory target.
     */
    register(container) {
      container.registerFactory(NOTIFICATION_REPOSITORY, () =>
        createNotificationRepository(container.resolve(PRISMA_CLIENT)),
      )
    },

    /**
     * Declare HTTP routes for this module.
     * The path is prefixed with the global apiPrefix and version (e.g. /api/v1/notifications).
     * Passing 'controller' enables automatic OpenAPI spec generation via SwaggerAdapter.
     */
    routes() {
      return {
        path: '/notifications',
        controller: NotificationController,
      }
    },
  }),
})
