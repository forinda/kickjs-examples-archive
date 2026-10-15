import { Service, Inject } from '@forinda/kickjs'
import type { UpdateProjectDTO } from '../dtos/update-project.dto'
import { PROJECT_REPOSITORY, type ProjectRepository } from '@/modules/projects/project.repository'

@Service()
export class UpdateProjectUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly repo: ProjectRepository,
  ) {}

  async execute(id: string, dto: UpdateProjectDTO) {
    return this.repo.update(id, dto)
  }
}
