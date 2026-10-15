import { defineModule } from '@forinda/kickjs'
import { MessagesController } from './presentation/messages.controller'
import {
  MESSAGE_REPOSITORY,
  createMessageRepository,
} from '@/modules/messages/infrastructure/repositories/message.repository'
import { MONGO_CONNECTION } from '@/shared/infrastructure/database/mongoose.adapter'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const MessagesModule = defineModule({
  name: 'MessagesModule',
  build: () => ({
    register(container) {
      container.registerFactory(MESSAGE_REPOSITORY, () =>
        createMessageRepository(container.resolve(MONGO_CONNECTION)),
      )
    },
    routes: () => ({ path: '/', controller: MessagesController }),
  }),
})
