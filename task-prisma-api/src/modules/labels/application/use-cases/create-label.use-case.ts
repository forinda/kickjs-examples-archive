import { Service, Inject } from '@forinda/kickjs'
import type { CreateLabelDTO } from '../dtos/create-label.dto'
import { LABEL_REPOSITORY, type LabelRepository } from '@/modules/labels/label.repository'

@Service()
export class CreateLabelUseCase {
  constructor(@Inject(LABEL_REPOSITORY) private readonly repo: LabelRepository) {}

  async execute(dto: CreateLabelDTO) {
    return this.repo.create(dto)
  }
}
