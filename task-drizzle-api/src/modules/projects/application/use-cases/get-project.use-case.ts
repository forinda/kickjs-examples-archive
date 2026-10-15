import { Service, Inject } from '@forinda/kickjs'
import { PROJECT_REPOSITORY, type ProjectRepository } from '@/modules/projects/project.repository'

@Service()
export class GetProjectUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly repo: ProjectRepository,
  ) {}

  async execute(id: string) {
    return this.repo.findById(id)
  }
}
