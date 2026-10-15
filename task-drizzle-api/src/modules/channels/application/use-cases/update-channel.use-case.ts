import { Service, Inject } from '@forinda/kickjs'
import type { UpdateChannelDTO } from '../dtos/update-channel.dto'
import { CHANNEL_REPOSITORY, type ChannelRepository } from '@/modules/channels/channel.repository'

@Service()
export class UpdateChannelUseCase {
  constructor(
    @Inject(CHANNEL_REPOSITORY)
    private readonly repo: ChannelRepository,
  ) {}

  async execute(id: string, dto: UpdateChannelDTO) {
    return this.repo.update(id, dto)
  }
}
