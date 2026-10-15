import { Service, Inject, HttpException } from '@forinda/kickjs'
import { MESSAGE_REPOSITORY, type MessageRepository } from '@/modules/messages/message.repository'

@Service()
export class MessageDomainService {
  constructor(
    @Inject(MESSAGE_REPOSITORY)
    private readonly repo: MessageRepository,
  ) {}

  async ensureExists(id: string) {
    const entity = await this.repo.findById(id)
    if (!entity) {
      throw HttpException.notFound('Message not found')
    }
    return entity
  }
}
