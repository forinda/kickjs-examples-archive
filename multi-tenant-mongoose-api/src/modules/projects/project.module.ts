import { defineModule } from '@forinda/kickjs'
import { ProjectController } from './project.controller'

export const ProjectModule = defineModule({
  name: 'ProjectModule',
  build: () => ({
    routes: () => ({ path: '/projects', controller: ProjectController }),
  }),
})
