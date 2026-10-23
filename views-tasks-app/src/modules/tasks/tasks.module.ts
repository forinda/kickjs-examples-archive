import { defineModule } from '@forinda/kickjs'
import { TasksController } from './tasks.controller'

export const TasksModule = defineModule({
  name: 'TasksModule',
  build: () => ({
    routes() {
      return { path: '/', controller: TasksController, prefix: false, version: false }
    },
  }),
})
