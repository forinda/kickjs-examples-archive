/**
 * Activity Module
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
  createActivityRepository,
  ACTIVITY_REPOSITORY,
} from '@/modules/activities/activity.repository'
import { ActivityController } from './presentation/activity.controller'

// Eagerly load decorated classes so @Service()/@Repository() decorators register in the DI container
import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

export const ActivityModule = defineModule({
  name: 'ActivityModule',
  build: () => ({
    register(container) {
      container.registerFactory(ACTIVITY_REPOSITORY, () =>
        createActivityRepository(container.resolve(DRIZZLE_DB)),
      )
    },
    routes: () => ({ path: '/activities', controller: ActivityController }),
  }),
})
