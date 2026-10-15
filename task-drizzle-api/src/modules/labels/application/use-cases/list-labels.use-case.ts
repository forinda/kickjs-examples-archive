import { Service, Inject, type ParsedQuery } from '@forinda/kickjs'
import { LABEL_REPOSITORY, type LabelRepository } from '@/modules/labels/label.repository'

@Service()
export class ListLabelsUseCase {
  constructor(@Inject(LABEL_REPOSITORY) private readonly repo: LabelRepository) {}

  async execute(parsed: ParsedQuery, workspaceId?: string) {
    return this.repo.findPaginated(parsed, workspaceId)
  }
}
