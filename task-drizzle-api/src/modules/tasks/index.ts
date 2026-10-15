import { defineModule } from '@forinda/kickjs'
import { DRIZZLE_DB } from '@/db'
import {
  createTaskAssigneeRepository,
  TASK_ASSIGNEE_REPOSITORY,
} from '@/modules/tasks/task-assignee.repository'
import { createTaskRepository, TASK_REPOSITORY } from '@/modules/tasks/task.repository'
import { TaskController } from './presentation/task.controller'

import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

export const TaskModule = defineModule({
  name: 'TaskModule',
  build: () => ({
    register(container) {
      container.registerFactory(TASK_ASSIGNEE_REPOSITORY, () =>
        createTaskAssigneeRepository(container.resolve(DRIZZLE_DB)),
      )
      container.registerFactory(TASK_REPOSITORY, () =>
        createTaskRepository(container.resolve(DRIZZLE_DB)),
      )
    },
    routes: () => ({ path: '/tasks', controller: TaskController }),
  }),
})
