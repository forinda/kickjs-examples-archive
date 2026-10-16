import { defineModule } from '@forinda/kickjs'
import { DB_PRIMARY } from '@forinda/kickjs-db'
import { WorkspaceController } from './workspace.controller'
import { createWorkspaceRepository, WORKSPACE_REPOSITORY } from './workspace.repository'

export const WorkspaceModule = defineModule({
  name: 'WorkspaceModule',
  build: () => ({
    register(container) {
      container.registerFactory(WORKSPACE_REPOSITORY, () =>
        createWorkspaceRepository(container.resolve(DB_PRIMARY)),
      )
    },
    routes: () => ({ path: '/workspaces', controller: WorkspaceController }),
  }),
})
