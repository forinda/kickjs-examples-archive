import { defineModule } from '@forinda/kickjs'
import { STATS_REPOSITORY } from './domain/repositories/stat.repository'
import { PrismaStatsRepository } from './infrastructure/repositories/prisma-stat.repository'
import { StatController } from './presentation/stat.controller'

import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

export const StatModule = defineModule({
  name: 'StatModule',
  build: () => ({
    register(container) {
      container.registerFactory(STATS_REPOSITORY, () => container.resolve(PrismaStatsRepository))
    },

    routes() {
      return {
        path: '/stats',
        controller: StatController,
      }
    },
  }),
})
