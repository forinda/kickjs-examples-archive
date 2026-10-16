import { defineModule } from '@forinda/kickjs'
import { DRIZZLE_DB } from '@/db'
import { createProjectRepository, PROJECT_REPOSITORY } from './project.repository'
import { ProjectController } from './project.controller'

export const ProjectModule = defineModule({
  name: 'ProjectModule',
  build: () => ({
    register(container) {
      container.registerFactory(PROJECT_REPOSITORY, () =>
        createProjectRepository(container.resolve(DRIZZLE_DB)),
      )
    },
    routes: () => ({ path: '/projects', controller: ProjectController }),
  }),
})
