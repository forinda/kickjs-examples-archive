import { defineModule } from '@forinda/kickjs'
import { StatsController } from './presentation/stats.controller'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()
// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const StatsModule = defineModule({
  name: 'StatsModule',
  build: () => ({
    routes: () => ({ path: '/', controller: StatsController }),
  }),
})
