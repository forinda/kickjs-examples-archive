import { defineModule } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'
import { PROJECT_REPOSITORY } from './domain/repositories/project.repository'
import { PrismaProjectRepository } from './infrastructure/repositories/prisma-project.repository'
import { ProjectController } from './presentation/project.controller'

import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

export const ProjectModule = defineModule({
  name: 'ProjectModule',
  build: () => ({
    register(container) {
      const factory = () => container.resolve(PrismaProjectRepository)
      container.registerFactory(PROJECT_REPOSITORY, factory)
      container.registerFactory(TOKENS.PROJECT_REPOSITORY, factory)
    },

    routes() {
      return {
        path: '/projects',
        controller: ProjectController,
      }
    },
  }),
})
