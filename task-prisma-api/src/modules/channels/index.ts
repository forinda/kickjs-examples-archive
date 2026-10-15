import { defineModule } from '@forinda/kickjs'
import { PRISMA_CLIENT } from '@/db/prisma'
import { CHANNEL_REPOSITORY, createChannelRepository } from './channel.repository'
import {
  CHANNEL_MEMBER_REPOSITORY,
  createChannelMemberRepository,
} from './channel-member.repository'
import { ChannelController } from './presentation/channel.controller'

import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

export const ChannelModule = defineModule({
  name: 'ChannelModule',
  build: () => ({
    register(container) {
      container.registerFactory(CHANNEL_REPOSITORY, () =>
        createChannelRepository(container.resolve(PRISMA_CLIENT)),
      )
      container.registerFactory(CHANNEL_MEMBER_REPOSITORY, () =>
        createChannelMemberRepository(container.resolve(PRISMA_CLIENT)),
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
