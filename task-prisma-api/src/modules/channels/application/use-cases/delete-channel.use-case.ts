import { Service, Inject } from '@forinda/kickjs'
import { CHANNEL_REPOSITORY, type ChannelRepository } from '@/modules/channels/channel.repository'

@Service()
export class DeleteChannelUseCase {
  constructor(
    @Inject(CHANNEL_REPOSITORY)
    private readonly repo: ChannelRepository,
  ) {}

  async execute(id: string) {
    await this.repo.delete(id)
  }
}
