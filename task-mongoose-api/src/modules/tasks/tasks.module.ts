import { defineModule } from '@forinda/kickjs'
import { TasksController } from './presentation/tasks.controller'
import {
  TASK_REPOSITORY,
  createTaskRepository,
} from '@/modules/tasks/infrastructure/repositories/task.repository'
import { MONGO_CONNECTION } from '@/shared/infrastructure/database/mongoose.adapter'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const TasksModule = defineModule({
  name: 'TasksModule',
  build: () => ({
    register(container) {
      container.registerFactory(TASK_REPOSITORY, () =>
        createTaskRepository(container.resolve(MONGO_CONNECTION)),
      )
    },
    routes: () => ({ path: '/', controller: TasksController }),
  }),
})
