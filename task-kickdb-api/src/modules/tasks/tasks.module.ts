import { defineModule } from '@forinda/kickjs'
import { DB_PRIMARY } from '@forinda/kickjs-db'
import { TasksController } from './tasks.controller'
import { createTasksRepository, TASKS_REPOSITORY } from './tasks.repository'

export const TasksModule = defineModule({
  name: 'TasksModule',
  build: () => ({
    register(container) {
      container.registerFactory(TASKS_REPOSITORY, () =>
        createTasksRepository(container.resolve(DB_PRIMARY)),
      )
    },
    routes: () => ({ path: '/tasks', controller: TasksController }),
  }),
})
