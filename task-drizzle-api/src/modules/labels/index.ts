import { defineModule } from '@forinda/kickjs'
import { DRIZZLE_DB } from '@/db'
import { createLabelRepository, LABEL_REPOSITORY } from '@/modules/labels/label.repository'
import {
  createTaskLabelRepository,
  TASK_LABEL_REPOSITORY,
} from '@/modules/labels/task-label.repository'
import { LabelController } from './presentation/label.controller'

import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

export const LabelModule = defineModule({
  name: 'LabelModule',
  build: () => ({
    register(container) {
      container.registerFactory(LABEL_REPOSITORY, () =>
        createLabelRepository(container.resolve(DRIZZLE_DB)),
      )
      container.registerFactory(TASK_LABEL_REPOSITORY, () =>
        createTaskLabelRepository(container.resolve(DRIZZLE_DB)),
      )
    },
    routes: () => ({ path: '/labels', controller: LabelController }),
  }),
})
