import { Service, Inject, HttpException } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/constants/error-codes'
import type { UpdateProjectDto } from '../dtos/update-project.dto'
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '@/modules/projects/infrastructure/repositories/project.repository'

@Service()
export class UpdateProjectUseCase {
  constructor(@Inject(PROJECT_REPOSITORY) private projectRepo: ProjectRepository) {}

  async execute(projectId: string, dto: UpdateProjectDto) {
    const project = await this.projectRepo.update(projectId, dto as any)
    if (!project) {
      throw HttpException.notFound(ErrorCode.PROJECT_NOT_FOUND)
    }
    return project
  }
}
