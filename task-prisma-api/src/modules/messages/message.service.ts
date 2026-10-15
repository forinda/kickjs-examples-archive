import { Service, Inject } from '@forinda/kickjs'
import { parseMentions } from '@/shared/mentions'
import { MESSAGE_REPOSITORY, type MessageRepository } from './message.repository'
import type { CreateMessageDTO } from './message.dto'

@Service()
export class MessageService {
  constructor(
    @Inject(MESSAGE_REPOSITORY)
    private readonly repo: MessageRepository,
  ) {}

  async create(dto: CreateMessageDTO, senderId: string) {
    const mentions = parseMentions(dto.content)
    return this.repo.create({
      channelId: dto.channelId,
      senderId,
      content: dto.content,
      mentions,
    })
  }
}
