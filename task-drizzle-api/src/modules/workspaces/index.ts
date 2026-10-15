import { defineModule } from '@forinda/kickjs'
import { DRIZZLE_DB } from '@/db'
import {
  createWorkspaceMemberRepository,
  WORKSPACE_MEMBER_REPOSITORY,
} from '@/modules/workspaces/workspace-member.repository'
import {
  createWorkspaceRepository,
  WORKSPACE_REPOSITORY,
} from '@/modules/workspaces/workspace.repository'
import { WorkspaceController } from './presentation/workspace.controller'

import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

export const WorkspaceModule = defineModule({
  name: 'WorkspaceModule',
  build: () => ({
    register(container) {
      container.registerFactory(WORKSPACE_MEMBER_REPOSITORY, () =>
        createWorkspaceMemberRepository(container.resolve(DRIZZLE_DB)),
      )
      container.registerFactory(WORKSPACE_REPOSITORY, () =>
        createWorkspaceRepository(container.resolve(DRIZZLE_DB)),
      )
    },
    routes: () => ({ path: '/workspaces', controller: WorkspaceController }),
  }),
})
