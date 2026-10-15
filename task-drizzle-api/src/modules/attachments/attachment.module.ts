import { defineModule } from '@forinda/kickjs'
import { DRIZZLE_DB } from '@/db'
import {
  createAttachmentRepository,
  ATTACHMENT_REPOSITORY,
} from './attachment.repository'
import { AttachmentController } from './attachment.controller'

export const AttachmentModule = defineModule({
  name: 'AttachmentModule',
  build: () => ({
    register(container) {
      container.registerFactory(ATTACHMENT_REPOSITORY, () =>
        createAttachmentRepository(container.resolve(DRIZZLE_DB)),
      )
    },
    routes: () => ({ path: '/attachments', controller: AttachmentController }),
  }),
})
