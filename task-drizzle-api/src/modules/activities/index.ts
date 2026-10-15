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
import { ACTIVITY_REPOSITORY } from './domain/repositories/activity.repository'
import { DrizzleActivityRepository } from './infrastructure/repositories/drizzle-activity.repository'
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
        container.resolve(DrizzleActivityRepository),
      )
    },
    routes: () => ({ path: '/activities', controller: ActivityController }),
  }),
})
