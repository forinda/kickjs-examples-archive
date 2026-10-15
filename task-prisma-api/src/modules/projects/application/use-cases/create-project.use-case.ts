import { Service, Inject } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'
import type { IProjectRepository } from '../../domain/repositories/project.repository'
import type { CreateProjectDTO } from '../dtos/create-project.dto'

@Service()
export class CreateProjectUseCase {
  constructor(
    @Inject(TOKENS.PROJECT_REPOSITORY)
    private readonly repo: IProjectRepository,
  ) {}

  async execute(dto: CreateProjectDTO) {
    return this.repo.create(dto)
  }
}
