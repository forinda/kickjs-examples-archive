import { defineModule } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'
import { MongoAttachmentRepository } from './infrastructure/repositories/mongo-attachment.repository'
import { AttachmentsController } from './presentation/attachments.controller'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const AttachmentsModule = defineModule({
  name: 'AttachmentsModule',
  build: () => ({
    register(container) {
      container.registerFactory(TOKENS.ATTACHMENT_REPOSITORY, () =>
        container.resolve(MongoAttachmentRepository),
      )
    },
    routes: () => ({ path: '/', controller: AttachmentsController }),
  }),
})
