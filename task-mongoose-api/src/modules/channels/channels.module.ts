import { defineModule } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'
import { MongoChannelRepository } from './infrastructure/repositories/mongo-channel.repository'
import { ChannelsController } from './presentation/channels.controller'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const ChannelsModule = defineModule({
  name: 'ChannelsModule',
  build: () => ({
    register(container) {
      container.registerFactory(TOKENS.CHANNEL_REPOSITORY, () =>
        container.resolve(MongoChannelRepository),
      )
    },
    routes: () => ({ path: '/', controller: ChannelsController }),
  }),
})
