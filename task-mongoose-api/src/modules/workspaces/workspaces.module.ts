import { defineModule } from '@forinda/kickjs'
import { WorkspacesController } from './presentation/workspaces.controller'
import {
  WORKSPACE_REPOSITORY,
  createWorkspaceRepository,
} from '@/modules/workspaces/infrastructure/repositories/workspace.repository'
import { MONGO_CONNECTION } from '@/shared/infrastructure/database/mongoose.adapter'
import {
  WORKSPACE_MEMBER_REPOSITORY,
  createWorkspaceMemberRepository,
} from '@/modules/workspaces/infrastructure/repositories/workspace-member.repository'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const WorkspacesModule = defineModule({
  name: 'WorkspacesModule',
  build: () => ({
    register(container) {
      container.registerFactory(WORKSPACE_REPOSITORY, () =>
        createWorkspaceRepository(container.resolve(MONGO_CONNECTION)),
      )
      container.registerFactory(WORKSPACE_MEMBER_REPOSITORY, () =>
        createWorkspaceMemberRepository(container.resolve(MONGO_CONNECTION)),
      )
    },
    routes: () => ({ path: '/workspaces', controller: WorkspacesController }),
  }),
})
