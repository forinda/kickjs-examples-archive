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
import { DRIZZLE_DB } from '@/db'
import {
  createNotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '@/modules/notifications/notification.repository'
import { NotificationController } from './presentation/notification.controller'

// Eagerly load decorated classes so @Service()/@Repository() decorators register in the DI container
import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

export const NotificationModule = defineModule({
  name: 'NotificationModule',
  build: () => ({
    register(container) {
      container.registerFactory(NOTIFICATION_REPOSITORY, () =>
        createNotificationRepository(container.resolve(DRIZZLE_DB)),
      )
    },
    routes: () => ({ path: '/notifications', controller: NotificationController }),
  }),
})
