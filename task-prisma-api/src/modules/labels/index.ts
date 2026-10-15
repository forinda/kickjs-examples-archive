import { defineModule } from '@forinda/kickjs'
import { LABEL_REPOSITORY } from './domain/repositories/label.repository'
import { TASK_LABEL_REPOSITORY } from './domain/repositories/task-label.repository'
import { PrismaLabelRepository } from './infrastructure/repositories/prisma-label.repository'
import { PrismaTaskLabelRepository } from './infrastructure/repositories/prisma-task-label.repository'
import { LabelController } from './presentation/label.controller'

import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

export const LabelModule = defineModule({
  name: 'LabelModule',
  build: () => ({
    register(container) {
      container.registerFactory(LABEL_REPOSITORY, () => container.resolve(PrismaLabelRepository))
      container.registerFactory(TASK_LABEL_REPOSITORY, () =>
        container.resolve(PrismaTaskLabelRepository),
      )
    },

    routes() {
      return {
        path: '/labels',
        controller: LabelController,
      }
    },
  }),
})
