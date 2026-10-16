import { defineModule } from '@forinda/kickjs'
import { DRIZZLE_DB } from '@/db'
import { createStatsRepository, STATS_REPOSITORY } from './stat.repository'
import { StatController } from './stat.controller'

export const StatModule = defineModule({
  name: 'StatModule',
  build: () => ({
    register(container) {
      container.registerFactory(STATS_REPOSITORY, () =>
        createStatsRepository(container.resolve(DRIZZLE_DB)),
      )
    },
    routes: () => ({ path: '/stats', controller: StatController }),
  }),
})
