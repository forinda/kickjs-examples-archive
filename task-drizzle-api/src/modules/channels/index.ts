import { defineModule } from '@forinda/kickjs'
import { DRIZZLE_DB } from '@/db'
import {
  createChannelMemberRepository,
  CHANNEL_MEMBER_REPOSITORY,
} from '@/modules/channels/channel-member.repository'
import { createChannelRepository, CHANNEL_REPOSITORY } from '@/modules/channels/channel.repository'
import { ChannelController } from './presentation/channel.controller'

import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

export const ChannelModule = defineModule({
  name: 'ChannelModule',
  build: () => ({
    register(container) {
      container.registerFactory(CHANNEL_MEMBER_REPOSITORY, () =>
        createChannelMemberRepository(container.resolve(DRIZZLE_DB)),
      )
      container.registerFactory(CHANNEL_REPOSITORY, () =>
        createChannelRepository(container.resolve(DRIZZLE_DB)),
      )
    },
    routes: () => ({ path: '/channels', controller: ChannelController }),
  }),
})
