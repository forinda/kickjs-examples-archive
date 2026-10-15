import { defineModule } from '@forinda/kickjs'
import { DRIZZLE_DB } from '@/db'
import { createProjectRepository, PROJECT_REPOSITORY } from '@/modules/projects/project.repository'
import { ProjectController } from './presentation/project.controller'

import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

export const ProjectModule = defineModule({
  name: 'ProjectModule',
  build: () => ({
    register(container) {
      container.registerFactory(PROJECT_REPOSITORY, () =>
        createProjectRepository(container.resolve(DRIZZLE_DB)),
      )
    },
    routes: () => ({ path: '/projects', controller: ProjectController }),
  }),
})
