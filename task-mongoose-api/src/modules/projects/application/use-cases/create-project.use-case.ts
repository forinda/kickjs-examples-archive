import { Service, Inject, HttpException } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/constants/error-codes'
import type { CreateProjectDto } from '../dtos/create-project.dto'
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '@/modules/projects/infrastructure/repositories/project.repository'

@Service()
export class CreateProjectUseCase {
  constructor(@Inject(PROJECT_REPOSITORY) private projectRepo: ProjectRepository) {}

  async execute(workspaceId: string, dto: CreateProjectDto) {
    const existing = await this.projectRepo.findByKeyAndWorkspace(dto.key, workspaceId)
    if (existing) {
      throw HttpException.conflict(ErrorCode.PROJECT_KEY_EXISTS)
    }

    return this.projectRepo.create({
      ...dto,
      workspaceId: workspaceId as any,
      leadId: dto.leadId as any,
    })
  }
}
