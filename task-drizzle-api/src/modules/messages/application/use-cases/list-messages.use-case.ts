import { Service, Inject } from '@forinda/kickjs'
import { MESSAGE_REPOSITORY, type MessageRepository } from '@/modules/messages/message.repository'

@Service()
export class ListMessagesUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY)
    private readonly repo: MessageRepository,
  ) {}

  async execute(channelId: string, cursor?: string, limit?: number) {
    return this.repo.findByChannel(channelId, cursor, limit)
  }
}
