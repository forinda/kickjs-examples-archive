import { defineModule } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'
import { MongoProjectRepository } from './infrastructure/repositories/mongo-project.repository'
import { ProjectsController } from './presentation/projects.controller'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const ProjectsModule = defineModule({
  name: 'ProjectsModule',
  build: () => ({
    register(container) {
      container.registerFactory(TOKENS.PROJECT_REPOSITORY, () =>
        container.resolve(MongoProjectRepository),
      )
    },
    routes: () => ({ path: '/', controller: ProjectsController }),
  }),
})
