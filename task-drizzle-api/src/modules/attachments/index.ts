/**
 * Attachment Module
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
import { ATTACHMENT_REPOSITORY } from './domain/repositories/attachment.repository'
import { DrizzleAttachmentRepository } from './infrastructure/repositories/drizzle-attachment.repository'
import { AttachmentController } from './presentation/attachment.controller'

// Eagerly load decorated classes so @Service()/@Repository() decorators register in the DI container
import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

export const AttachmentModule = defineModule({
  name: 'AttachmentModule',
  build: () => ({
    register(container) {
      container.registerFactory(ATTACHMENT_REPOSITORY, () =>
        container.resolve(DrizzleAttachmentRepository),
      )
    },
    routes: () => ({ path: '/attachments', controller: AttachmentController }),
  }),
})
