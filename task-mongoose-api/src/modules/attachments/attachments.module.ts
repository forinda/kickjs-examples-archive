import { defineModule } from '@forinda/kickjs'
import { AttachmentsController } from './presentation/attachments.controller'
import {
  ATTACHMENT_REPOSITORY,
  createAttachmentRepository,
} from '@/modules/attachments/infrastructure/repositories/attachment.repository'
import { MONGO_CONNECTION } from '@/shared/infrastructure/database/mongoose.adapter'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const AttachmentsModule = defineModule({
  name: 'AttachmentsModule',
  build: () => ({
    register(container) {
      container.registerFactory(ATTACHMENT_REPOSITORY, () =>
        createAttachmentRepository(container.resolve(MONGO_CONNECTION)),
      )
    },
    routes: () => ({ path: '/', controller: AttachmentsController }),
  }),
})
