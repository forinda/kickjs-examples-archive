import { Service, Inject, HttpException } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/constants/error-codes'
import type { CreateProjectDTO } from '../dtos/create-project.dto'
import { PROJECT_REPOSITORY, type ProjectRepository } from '@/modules/projects/project.repository'

@Service()
export class CreateProjectUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly repo: ProjectRepository,
  ) {}

  async execute(dto: CreateProjectDTO) {
    return this.repo.create(dto)
  }
}
