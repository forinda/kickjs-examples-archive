import { Service, Inject } from '@forinda/kickjs'
import type { UpdateLabelDTO } from '../dtos/update-label.dto'
import { LABEL_REPOSITORY, type LabelRepository } from '@/modules/labels/label.repository'

@Service()
export class UpdateLabelUseCase {
  constructor(@Inject(LABEL_REPOSITORY) private readonly repo: LabelRepository) {}

  async execute(id: string, dto: UpdateLabelDTO) {
    return this.repo.update(id, dto)
  }
}
