import { defineModule } from '@forinda/kickjs'
import { ActivityController } from './activity.controller'
import { ACTIVITY_REPOSITORY, createActivityRepository } from './activity.repository'
import { MONGO_CONNECTION } from '@/adapters/mongoose.adapter'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const ActivityModule = defineModule({
  name: 'ActivityModule',
  build: () => ({
    register(container) {
      container.registerFactory(ACTIVITY_REPOSITORY, () =>
        createActivityRepository(container.resolve(MONGO_CONNECTION)),
      )
    },
    routes: () => ({ path: '/', controller: ActivityController }),
  }),
})
