import { defineModule } from '@forinda/kickjs'
import { PRISMA_CLIENT } from '@/db/prisma'
import { PROJECT_REPOSITORY, createProjectRepository } from './project.repository'
import { ProjectController } from './project.controller'

export const ProjectModule = defineModule({
  name: 'ProjectModule',
  build: () => ({
    register(container) {
      container.registerFactory(PROJECT_REPOSITORY, () =>
        createProjectRepository(container.resolve(PRISMA_CLIENT)),
      )
    },

    routes() {
      return {
        path: '/projects',
        controller: ProjectController,
      }
    },
  }),
})
