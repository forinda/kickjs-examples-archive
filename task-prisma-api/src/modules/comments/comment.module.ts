import { defineModule } from '@forinda/kickjs'
import { PRISMA_CLIENT } from '@/db/prisma'
import { COMMENT_REPOSITORY, createCommentRepository } from './comment.repository'
import { CommentController } from './comment.controller'

export const CommentModule = defineModule({
  name: 'CommentModule',
  build: () => ({
    /**
     * Register module dependencies in the DI container.
     * Bind repository interface tokens to their implementations here.
     * To swap implementations (e.g. in-memory -> Prisma), change the factory target.
     */
    register(container) {
      container.registerFactory(COMMENT_REPOSITORY, () =>
        createCommentRepository(container.resolve(PRISMA_CLIENT)),
      )
    },

    /**
     * Declare HTTP routes for this module.
     * The path is prefixed with the global apiPrefix and version (e.g. /api/v1/comments).
     * Passing 'controller' enables automatic OpenAPI spec generation via SwaggerAdapter.
     */
    routes() {
      return {
        path: '/comments',
        controller: CommentController,
      }
    },
  }),
})
