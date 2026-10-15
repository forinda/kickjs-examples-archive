import { defineModule } from '@forinda/kickjs'
import { TasksController } from './tasks.controller'

export const TasksModule = defineModule({
  name: 'TasksModule',
  build: () => ({
    routes: () => ({ path: '/tasks', controller: TasksController }),
  }),
})
