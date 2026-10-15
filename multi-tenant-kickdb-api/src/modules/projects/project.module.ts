import { defineModule } from '@forinda/kickjs'
import { APP_DB } from '../../db/db.adapter'
import { ProjectController } from './project.controller'
import { createProjectRepository, PROJECT_REPOSITORY } from './project.repository'

export const ProjectModule = defineModule({
  name: 'ProjectModule',
  build: () => ({
    register(container) {
      container.registerFactory(PROJECT_REPOSITORY, () =>
        createProjectRepository(container.resolve(APP_DB)),
      )
    },
    routes: () => ({ path: '/projects', controller: ProjectController }),
  }),
})
