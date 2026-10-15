import { defineModule } from '@forinda/kickjs'
import { DB_PRIMARY } from '@forinda/kickjs-db'
import { WorkspacesController } from './workspaces.controller'
import { createWorkspacesRepository, WORKSPACES_REPOSITORY } from './workspaces.repository'

export const WorkspacesModule = defineModule({
  name: 'WorkspacesModule',
  build: () => ({
    register(container) {
      container.registerFactory(WORKSPACES_REPOSITORY, () =>
        createWorkspacesRepository(container.resolve(DB_PRIMARY)),
      )
    },
    routes: () => ({ path: '/workspaces', controller: WorkspacesController }),
  }),
})
