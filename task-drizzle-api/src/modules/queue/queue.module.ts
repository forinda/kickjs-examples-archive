import { defineModule } from '@forinda/kickjs'

// Eagerly load decorated classes so @Job() decorators populate the jobRegistry
import.meta.glob(['./infrastructure/processors/**/*.ts', '!./**/*.test.ts'], {
  eager: true,
})

export const QueueModule = defineModule({
  name: 'QueueModule',
  build: () => ({
    routes: () => null,
  }),
})
