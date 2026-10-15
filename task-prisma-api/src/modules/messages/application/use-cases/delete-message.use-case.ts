import { Service, Inject } from '@forinda/kickjs'
import { MESSAGE_REPOSITORY, type MessageRepository } from '@/modules/messages/message.repository'

@Service()
export class DeleteMessageUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY)
    private readonly repo: MessageRepository,
  ) {}

  async execute(id: string) {
    await this.repo.delete(id)
  }
}
