import { defineModule } from '@forinda/kickjs'
import { PRISMA_CLIENT } from '@/db/prisma'
import { TASK_REPOSITORY, createTaskRepository } from './task.repository'
import { TASK_ASSIGNEE_REPOSITORY, createTaskAssigneeRepository } from './task-assignee.repository'
import { TaskController } from './presentation/task.controller'

import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

export const TaskModule = defineModule({
  name: 'TaskModule',
  build: () => ({
    register(container) {
      container.registerFactory(TASK_REPOSITORY, () =>
        createTaskRepository(container.resolve(PRISMA_CLIENT)),
      )
      container.registerFactory(TASK_ASSIGNEE_REPOSITORY, () =>
        createTaskAssigneeRepository(container.resolve(PRISMA_CLIENT)),
      )
    },

    routes() {
      return {
        path: '/tasks',
        controller: TaskController,
      }
    },
  }),
})
