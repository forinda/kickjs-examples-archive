import { Service, Inject } from '@forinda/kickjs'
import { MESSAGE_REPOSITORY, type MessageRepository } from '@/modules/messages/message.repository'

@Service()
export class GetMessageUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY)
    private readonly repo: MessageRepository,
  ) {}

  async execute(id: string) {
    return this.repo.findById(id)
  }
}
