import { defineModule } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'
import { MongoWorkspaceRepository } from './infrastructure/repositories/mongo-workspace.repository'
import { MongoWorkspaceMemberRepository } from './infrastructure/repositories/mongo-workspace-member.repository'
import { WorkspacesController } from './presentation/workspaces.controller'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const WorkspacesModule = defineModule({
  name: 'WorkspacesModule',
  build: () => ({
    register(container) {
      container.registerFactory(TOKENS.WORKSPACE_REPOSITORY, () =>
        container.resolve(MongoWorkspaceRepository),
      )
      container.registerFactory(TOKENS.WORKSPACE_MEMBER_REPOSITORY, () =>
        container.resolve(MongoWorkspaceMemberRepository),
      )
    },
    routes: () => ({ path: '/workspaces', controller: WorkspacesController }),
  }),
})
