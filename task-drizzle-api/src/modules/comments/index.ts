/**
 * Comment Module
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
import { createCommentRepository, COMMENT_REPOSITORY } from '@/modules/comments/comment.repository'
import { CommentController } from './presentation/comment.controller'

// Eagerly load decorated classes so @Service()/@Repository() decorators register in the DI container
import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

export const CommentModule = defineModule({
  name: 'CommentModule',
  build: () => ({
    register(container) {
      container.registerFactory(COMMENT_REPOSITORY, () =>
        createCommentRepository(container.resolve(DRIZZLE_DB)),
      )
    },
    routes: () => ({ path: '/comments', controller: CommentController }),
  }),
})
