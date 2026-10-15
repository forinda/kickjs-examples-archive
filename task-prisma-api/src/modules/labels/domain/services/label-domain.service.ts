import { Service, Inject, HttpException } from '@forinda/kickjs'
import { LABEL_REPOSITORY, type LabelRepository } from '@/modules/labels/label.repository'

@Service()
export class LabelDomainService {
  constructor(@Inject(LABEL_REPOSITORY) private readonly repo: LabelRepository) {}

  async ensureExists(id: string) {
    const entity = await this.repo.findById(id)
    if (!entity) {
      throw HttpException.notFound('Label not found')
    }
    return entity
  }
}
