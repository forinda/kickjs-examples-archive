import { defineModule } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'
import { MongoLabelRepository } from './infrastructure/repositories/mongo-label.repository'
import { LabelsController } from './presentation/labels.controller'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const LabelsModule = defineModule({
  name: 'LabelsModule',
  build: () => ({
    register(container) {
      container.registerFactory(TOKENS.LABEL_REPOSITORY, () =>
        container.resolve(MongoLabelRepository),
      )
    },
    routes: () => ({ path: '/', controller: LabelsController }),
  }),
})
