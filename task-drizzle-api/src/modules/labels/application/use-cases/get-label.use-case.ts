import { Service, Inject } from '@forinda/kickjs'
import { LABEL_REPOSITORY, type LabelRepository } from '@/modules/labels/label.repository'

@Service()
export class GetLabelUseCase {
  constructor(@Inject(LABEL_REPOSITORY) private readonly repo: LabelRepository) {}

  async execute(id: string) {
    return this.repo.findById(id)
  }
}
