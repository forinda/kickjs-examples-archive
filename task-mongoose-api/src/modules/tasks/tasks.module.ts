import { defineModule } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'
import { MongoTaskRepository } from './infrastructure/repositories/mongo-task.repository'
import { TasksController } from './presentation/tasks.controller'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const TasksModule = defineModule({
  name: 'TasksModule',
  build: () => ({
    register(container) {
      container.registerFactory(TOKENS.TASK_REPOSITORY, () =>
        container.resolve(MongoTaskRepository),
      )
    },
    routes: () => ({ path: '/', controller: TasksController }),
  }),
})
