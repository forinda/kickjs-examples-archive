import { defineModule } from '@forinda/kickjs'
import { ProjectsController } from './presentation/projects.controller'
import {
  PROJECT_REPOSITORY,
  createProjectRepository,
} from '@/modules/projects/infrastructure/repositories/project.repository'
import { MONGO_CONNECTION } from '@/shared/infrastructure/database/mongoose.adapter'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const ProjectsModule = defineModule({
  name: 'ProjectsModule',
  build: () => ({
    register(container) {
      container.registerFactory(PROJECT_REPOSITORY, () =>
        createProjectRepository(container.resolve(MONGO_CONNECTION)),
      )
    },
    routes: () => ({ path: '/', controller: ProjectsController }),
  }),
})
