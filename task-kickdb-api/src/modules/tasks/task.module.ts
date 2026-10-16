import { defineModule } from '@forinda/kickjs'
import { DB_PRIMARY } from '@forinda/kickjs-db'
import { TaskController } from './task.controller'
import { createTaskRepository, TASK_REPOSITORY } from './task.repository'

export const TaskModule = defineModule({
  name: 'TaskModule',
  build: () => ({
    register(container) {
      container.registerFactory(TASK_REPOSITORY, () =>
        createTaskRepository(container.resolve(DB_PRIMARY)),
      )
    },
    routes: () => ({ path: '/tasks', controller: TaskController }),
  }),
})
