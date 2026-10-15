import { Service, Inject } from '@forinda/kickjs'
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '@/modules/projects/infrastructure/repositories/project.repository'

@Service()
export class ListProjectsUseCase {
  constructor(@Inject(PROJECT_REPOSITORY) private projectRepo: ProjectRepository) {}

  async execute(workspaceId: string) {
    return this.projectRepo.findByWorkspace(workspaceId)
  }
}
