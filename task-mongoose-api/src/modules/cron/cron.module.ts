import { defineModule } from '@forinda/kickjs'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const CronModule = defineModule({
  name: 'CronModule',
  build: () => ({
    routes: () => null,
  }),
})
