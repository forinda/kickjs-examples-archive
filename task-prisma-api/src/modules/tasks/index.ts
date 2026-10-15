import { defineModule } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'
import { TASK_REPOSITORY } from './domain/repositories/task.repository'
import { PrismaTaskRepository } from './infrastructure/repositories/prisma-task.repository'
import { PrismaTaskAssigneeRepository } from './infrastructure/repositories/prisma-task-assignee.repository'
import { TaskController } from './presentation/task.controller'

import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

export const TaskModule = defineModule({
  name: 'TaskModule',
  build: () => ({
    register(container) {
      const taskFactory = () => container.resolve(PrismaTaskRepository)
      container.registerFactory(TASK_REPOSITORY, taskFactory)
      container.registerFactory(TOKENS.TASK_REPOSITORY, taskFactory)

      container.registerFactory(TOKENS.TASK_ASSIGNEE_REPOSITORY, () =>
        container.resolve(PrismaTaskAssigneeRepository),
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
