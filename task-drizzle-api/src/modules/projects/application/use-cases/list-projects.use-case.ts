import { Service, Inject } from '@forinda/kickjs'
import { PROJECT_REPOSITORY, type ProjectRepository } from '@/modules/projects/project.repository'

@Service()
export class ListProjectsUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly repo: ProjectRepository,
  ) {}

  async executeByWorkspace(workspaceId: string) {
    return this.repo.findByWorkspace(workspaceId)
  }
}
