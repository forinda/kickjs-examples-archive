import { Service, Inject } from '@forinda/kickjs'
import {
  ATTACHMENT_REPOSITORY,
  type AttachmentRepository,
} from '@/modules/attachments/attachment.repository'

@Service()
export class GetAttachmentUseCase {
  constructor(@Inject(ATTACHMENT_REPOSITORY) private readonly repo: AttachmentRepository) {}

  async execute(id: string) {
    return this.repo.findById(id)
  }
}
