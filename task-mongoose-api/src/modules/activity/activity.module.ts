import { defineModule } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'
import { MongoActivityRepository } from './infrastructure/repositories/mongo-activity.repository'
import { ActivityController } from './presentation/activity.controller'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const ActivityModule = defineModule({
  name: 'ActivityModule',
  build: () => ({
    register(container) {
      container.registerFactory(TOKENS.ACTIVITY_REPOSITORY, () =>
        container.resolve(MongoActivityRepository),
      )
    },
    routes: () => ({ path: '/', controller: ActivityController }),
  }),
})
