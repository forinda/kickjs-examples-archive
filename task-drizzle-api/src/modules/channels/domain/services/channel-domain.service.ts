import { Service, Inject, HttpException } from '@forinda/kickjs'
import { CHANNEL_REPOSITORY, type ChannelRepository } from '@/modules/channels/channel.repository'

@Service()
export class ChannelDomainService {
  constructor(
    @Inject(CHANNEL_REPOSITORY)
    private readonly repo: ChannelRepository,
  ) {}

  async ensureExists(id: string) {
    const entity = await this.repo.findById(id)
    if (!entity) {
      throw HttpException.notFound('Channel not found')
    }
    return entity
  }
}
