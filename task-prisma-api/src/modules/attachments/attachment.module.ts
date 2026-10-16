import { defineModule } from '@forinda/kickjs'
import { PRISMA_CLIENT } from '@/db/prisma'
import { ATTACHMENT_REPOSITORY, createAttachmentRepository } from './attachment.repository'
import { AttachmentController } from './attachment.controller'

export const AttachmentModule = defineModule({
  name: 'AttachmentModule',
  build: () => ({
    /**
     * Register module dependencies in the DI container.
     * Bind repository interface tokens to their implementations here.
     * To swap implementations (e.g. in-memory -> Prisma), change the factory target.
     */
    register(container) {
      container.registerFactory(ATTACHMENT_REPOSITORY, () =>
        createAttachmentRepository(container.resolve(PRISMA_CLIENT)),
      )
    },

    /**
     * Declare HTTP routes for this module.
     * The path is prefixed with the global apiPrefix and version (e.g. /api/v1/attachments).
     * Passing 'controller' enables automatic OpenAPI spec generation via SwaggerAdapter.
     */
    routes() {
      return {
        path: '/attachments',
        controller: AttachmentController,
      }
    },
  }),
})
