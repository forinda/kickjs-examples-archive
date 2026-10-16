import { defineModule } from '@forinda/kickjs'
import { ChannelsController } from './channel.controller'
import { CHANNEL_REPOSITORY, createChannelRepository } from './channel.repository'
import { MONGO_CONNECTION } from '@/adapters/mongoose.adapter'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const ChannelsModule = defineModule({
  name: 'ChannelsModule',
  build: () => ({
    register(container) {
      container.registerFactory(CHANNEL_REPOSITORY, () =>
        createChannelRepository(container.resolve(MONGO_CONNECTION)),
      )
    },
    routes: () => ({ path: '/', controller: ChannelsController }),
  }),
})
