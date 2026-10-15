import { Service, Inject } from '@forinda/kickjs'
import { CHANNEL_REPOSITORY, type ChannelRepository } from '@/modules/channels/channel.repository'

@Service()
export class GetChannelUseCase {
  constructor(
    @Inject(CHANNEL_REPOSITORY)
    private readonly repo: ChannelRepository,
  ) {}

  async execute(id: string) {
    return this.repo.findById(id)
  }
}
