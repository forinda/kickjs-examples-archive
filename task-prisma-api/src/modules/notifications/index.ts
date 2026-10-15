/**
 * Notification Module
 *
 * Self-contained feature module following Domain-Driven Design (DDD).
 * Registers dependencies in the DI container and declares HTTP routes.
 *
 * Structure:
 *   presentation/    — HTTP controllers (entry points)
 *   application/     — Use cases (orchestration) and DTOs (validation)
 *   domain/          — Entities, value objects, repository interfaces, domain services
 *   infrastructure/  — Repository implementations (in-memory, Drizzle, Prisma, etc.)
 */
import { defineModule } from '@forinda/kickjs'
import { NOTIFICATION_REPOSITORY } from './domain/repositories/notification.repository'
import { PrismaNotificationRepository } from './infrastructure/repositories/prisma-notification.repository'
import { NotificationController } from './presentation/notification.controller'

// Eagerly load decorated classes so @Service()/@Repository() decorators register in the DI container
import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

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
        container.resolve(PrismaNotificationRepository),
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
