import { defineModule } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'
import { WORKSPACE_REPOSITORY } from './domain/repositories/workspace.repository'
import { PrismaWorkspaceRepository } from './infrastructure/repositories/prisma-workspace.repository'
import { PrismaWorkspaceMemberRepository } from './infrastructure/repositories/prisma-workspace-member.repository'
import { WorkspaceController } from './presentation/workspace.controller'

import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

export const WorkspaceModule = defineModule({
  name: 'WorkspaceModule',
  build: () => ({
    register(container) {
      const workspaceFactory = () => container.resolve(PrismaWorkspaceRepository)
      container.registerFactory(WORKSPACE_REPOSITORY, workspaceFactory)
      container.registerFactory(TOKENS.WORKSPACE_REPOSITORY, workspaceFactory)

      const memberFactory = () => container.resolve(PrismaWorkspaceMemberRepository)
      container.registerFactory(TOKENS.WORKSPACE_MEMBER_REPOSITORY, memberFactory)
    },

    routes() {
      return {
        path: '/workspaces',
        controller: WorkspaceController,
      }
    },
  }),
})
