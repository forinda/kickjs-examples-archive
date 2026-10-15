import { Service, Inject, HttpException } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/constants/error-codes'
import type { ProjectRepository, Project } from '@/modules/projects/project.repository'
import { PROJECT_REPOSITORY } from '@/modules/projects/project.repository'

@Service()
export class ProjectDomainService {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly repo: ProjectRepository,
  ) {}

  async ensureExists(id: string): Promise<Project> {
    const project = await this.repo.findById(id)
    if (!project) {
      throw HttpException.notFound(ErrorCode.PROJECT_NOT_FOUND)
    }
    return project
  }
}
