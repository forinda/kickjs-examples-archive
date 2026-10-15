import { Service, Inject } from '@forinda/kickjs'
import { LABEL_REPOSITORY, type LabelRepository } from '@/modules/labels/label.repository'

@Service()
export class DeleteLabelUseCase {
  constructor(@Inject(LABEL_REPOSITORY) private readonly repo: LabelRepository) {}

  async execute(id: string) {
    await this.repo.delete(id)
  }
}
