import { defineModule } from '@forinda/kickjs'
import { PRISMA_CLIENT } from '@/db/prisma'
import { STATS_REPOSITORY, createStatsRepository } from './stats.repository'
import { StatController } from './stats.controller'

export const StatModule = defineModule({
  name: 'StatModule',
  build: () => ({
    register(container) {
      container.registerFactory(STATS_REPOSITORY, () =>
        createStatsRepository(container.resolve(PRISMA_CLIENT)),
      )
    },

    routes() {
      return {
        path: '/stats',
        controller: StatController,
      }
    },
  }),
})
