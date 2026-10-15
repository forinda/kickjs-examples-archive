import { defineModule } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'
import { MongoMessageRepository } from './infrastructure/repositories/mongo-message.repository'
import { MessagesController } from './presentation/messages.controller'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const MessagesModule = defineModule({
  name: 'MessagesModule',
  build: () => ({
    register(container) {
      container.registerFactory(TOKENS.MESSAGE_REPOSITORY, () =>
        container.resolve(MongoMessageRepository),
      )
    },
    routes: () => ({ path: '/', controller: MessagesController }),
  }),
})
