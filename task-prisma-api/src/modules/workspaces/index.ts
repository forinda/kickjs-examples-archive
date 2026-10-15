import { defineModule } from '@forinda/kickjs'
import { PRISMA_CLIENT } from '@/db/prisma'
import { WORKSPACE_REPOSITORY, createWorkspaceRepository } from './workspace.repository'
import {
  WORKSPACE_MEMBER_REPOSITORY,
  createWorkspaceMemberRepository,
} from './workspace-member.repository'
import { WorkspaceController } from './presentation/workspace.controller'

import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

export const WorkspaceModule = defineModule({
  name: 'WorkspaceModule',
  build: () => ({
    register(container) {
      container.registerFactory(WORKSPACE_REPOSITORY, () =>
        createWorkspaceRepository(container.resolve(PRISMA_CLIENT)),
      )
      container.registerFactory(WORKSPACE_MEMBER_REPOSITORY, () =>
        createWorkspaceMemberRepository(container.resolve(PRISMA_CLIENT)),
      )
    },

    routes() {
      return {
        path: '/workspaces',
        controller: WorkspaceController,
      }
    },
  }),
})
