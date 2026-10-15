import { defineModule } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'
import { DrizzleMessageRepository } from './infrastructure/repositories/drizzle-message.repository'
import { MessageController } from './presentation/message.controller'

import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

export const MessageModule = defineModule({
  name: 'MessageModule',
  build: () => ({
    register(container) {
      container.registerFactory(TOKENS.MESSAGE_REPOSITORY, () =>
        container.resolve(DrizzleMessageRepository),
      )
    },
    routes: () => ({ path: '/messages', controller: MessageController }),
  }),
})
