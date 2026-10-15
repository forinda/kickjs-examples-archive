import { defineModule } from '@forinda/kickjs'
import { DRIZZLE_DB } from '@/db'
import { createMessageRepository, MESSAGE_REPOSITORY } from '@/modules/messages/message.repository'
import { MessageController } from './presentation/message.controller'

import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

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
