import { defineModule } from '@forinda/kickjs'
import { LabelsController } from './presentation/labels.controller'
import {
  LABEL_REPOSITORY,
  createLabelRepository,
} from '@/modules/labels/infrastructure/repositories/label.repository'
import { MONGO_CONNECTION } from '@/shared/infrastructure/database/mongoose.adapter'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const LabelsModule = defineModule({
  name: 'LabelsModule',
  build: () => ({
    register(container) {
      container.registerFactory(LABEL_REPOSITORY, () =>
        createLabelRepository(container.resolve(MONGO_CONNECTION)),
      )
    },
    routes: () => ({ path: '/', controller: LabelsController }),
  }),
})
