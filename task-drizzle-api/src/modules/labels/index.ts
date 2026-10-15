import { defineModule } from '@forinda/kickjs'
import { LABEL_REPOSITORY } from './domain/repositories/label.repository'
import { TASK_LABEL_REPOSITORY } from './domain/repositories/task-label.repository'
import { DrizzleLabelRepository } from './infrastructure/repositories/drizzle-label.repository'
import { DrizzleTaskLabelRepository } from './infrastructure/repositories/drizzle-task-label.repository'
import { LabelController } from './presentation/label.controller'

import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

export const LabelModule = defineModule({
  name: 'LabelModule',
  build: () => ({
    register(container) {
      container.registerFactory(LABEL_REPOSITORY, () => container.resolve(DrizzleLabelRepository))
      container.registerFactory(TASK_LABEL_REPOSITORY, () =>
        container.resolve(DrizzleTaskLabelRepository),
      )
    },
    routes: () => ({ path: '/labels', controller: LabelController }),
  }),
})
