import { defineModule } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'
import { PrismaMessageRepository } from './infrastructure/repositories/prisma-message.repository'
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
        container.resolve(PrismaMessageRepository),
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
