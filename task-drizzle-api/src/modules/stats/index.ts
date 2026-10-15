import { defineModule } from '@forinda/kickjs'
import { DRIZZLE_DB } from '@/db'
import { createStatsRepository, STATS_REPOSITORY } from '@/modules/stats/stat.repository'
import { StatController } from './presentation/stat.controller'

import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

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
