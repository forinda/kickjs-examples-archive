import { defineModule } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'
import { DrizzleChannelRepository } from './infrastructure/repositories/drizzle-channel.repository'
import { DrizzleChannelMemberRepository } from './infrastructure/repositories/drizzle-channel-member.repository'
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
        container.resolve(DrizzleChannelRepository),
      )
      container.registerFactory(TOKENS.CHANNEL_MEMBER_REPOSITORY, () =>
        container.resolve(DrizzleChannelMemberRepository),
      )
    },
    routes: () => ({ path: '/channels', controller: ChannelController }),
  }),
})
