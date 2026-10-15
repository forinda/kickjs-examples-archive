import { Service, Inject, HttpException } from '@forinda/kickjs'
import {
  ATTACHMENT_REPOSITORY,
  type AttachmentRepository,
} from '@/modules/attachments/attachment.repository'

@Service()
export class AttachmentDomainService {
  constructor(@Inject(ATTACHMENT_REPOSITORY) private readonly repo: AttachmentRepository) {}

  async ensureExists(id: string) {
    const entity = await this.repo.findById(id)
    if (!entity) {
      throw HttpException.notFound('Attachment not found')
    }
    return entity
  }
}
