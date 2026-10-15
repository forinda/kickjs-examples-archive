import { defineModule } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'
import { PrismaChannelRepository } from './infrastructure/repositories/prisma-channel.repository'
import { PrismaChannelMemberRepository } from './infrastructure/repositories/prisma-channel-member.repository'
import { ChannelController } from './presentation/channel.controller'

import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

export const ChannelModule = defineModule({
  name: 'ChannelModule',
  build: () => ({
    register(container) {
      container.registerFactory(TOKENS.CHANNEL_REPOSITORY, () =>
        container.resolve(PrismaChannelRepository),
      )
      container.registerFactory(TOKENS.CHANNEL_MEMBER_REPOSITORY, () =>
        container.resolve(PrismaChannelMemberRepository),
      )
    },

    routes() {
      return {
        path: '/channels',
        controller: ChannelController,
      }
    },
  }),
})
