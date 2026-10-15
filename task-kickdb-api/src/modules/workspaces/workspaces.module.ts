import { defineModule } from '@forinda/kickjs'
import { WorkspacesController } from './workspaces.controller'

export const WorkspacesModule = defineModule({
  name: 'WorkspacesModule',
  build: () => ({
    routes: () => ({ path: '/workspaces', controller: WorkspacesController }),
  }),
})
