import { defineModule } from '@forinda/kickjs'
import { PRISMA_CLIENT } from '@/db/prisma'
import { LABEL_REPOSITORY, createLabelRepository } from './label.repository'
import { TASK_LABEL_REPOSITORY, createTaskLabelRepository } from './task-label.repository'
import { LabelController } from './label.controller'

export const LabelModule = defineModule({
  name: 'LabelModule',
  build: () => ({
    register(container) {
      container.registerFactory(LABEL_REPOSITORY, () =>
        createLabelRepository(container.resolve(PRISMA_CLIENT)),
      )
      container.registerFactory(TASK_LABEL_REPOSITORY, () =>
        createTaskLabelRepository(container.resolve(PRISMA_CLIENT)),
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
