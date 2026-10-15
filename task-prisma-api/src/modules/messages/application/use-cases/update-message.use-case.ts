import { Service, Inject } from '@forinda/kickjs'
import type { UpdateMessageDTO } from '../dtos/update-message.dto'
import { MESSAGE_REPOSITORY, type MessageRepository } from '@/modules/messages/message.repository'

@Service()
export class UpdateMessageUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY)
    private readonly repo: MessageRepository,
  ) {}

  async execute(id: string, dto: UpdateMessageDTO) {
    return this.repo.update(id, { content: dto.content })
  }
}
