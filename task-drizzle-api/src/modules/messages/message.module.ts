import { defineModule } from '@forinda/kickjs'
import { DRIZZLE_DB } from '@/db'
import { createMessageRepository, MESSAGE_REPOSITORY } from './message.repository'
import { MessageController } from './message.controller'

export const MessageModule = defineModule({
  name: 'MessageModule',
  build: () => ({
    register(container) {
      container.registerFactory(MESSAGE_REPOSITORY, () =>
        createMessageRepository(container.resolve(DRIZZLE_DB)),
      )
    },
    routes: () => ({ path: '/messages', controller: MessageController }),
  }),
})
