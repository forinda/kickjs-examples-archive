import { Service, Inject } from '@forinda/kickjs'
import type { ParsedQuery } from '@forinda/kickjs'
import {
  ATTACHMENT_REPOSITORY,
  type AttachmentRepository,
} from '@/modules/attachments/attachment.repository'

@Service()
export class ListAttachmentsUseCase {
  constructor(@Inject(ATTACHMENT_REPOSITORY) private readonly repo: AttachmentRepository) {}

  async execute(parsed: ParsedQuery, taskId?: string) {
    return this.repo.findPaginated(parsed, taskId)
  }
}
