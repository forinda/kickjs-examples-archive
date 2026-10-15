import { defineModule } from '@forinda/kickjs'
import { PRISMA_CLIENT } from '@/db/prisma'
import { MESSAGE_REPOSITORY, createMessageRepository } from './message.repository'
import { MessageController } from './message.controller'

export const MessageModule = defineModule({
  name: 'MessageModule',
  build: () => ({
    register(container) {
      container.registerFactory(MESSAGE_REPOSITORY, () =>
        createMessageRepository(container.resolve(PRISMA_CLIENT)),
      )
    },

    routes() {
      return {
        path: '/messages',
        controller: MessageController,
      }
    },
  }),
})
