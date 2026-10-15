import { Service, Inject, type ParsedQuery } from '@forinda/kickjs'
import { CHANNEL_REPOSITORY, type ChannelRepository } from '@/modules/channels/channel.repository'

@Service()
export class ListChannelsUseCase {
  constructor(
    @Inject(CHANNEL_REPOSITORY)
    private readonly repo: ChannelRepository,
  ) {}

  async execute(parsed: ParsedQuery, workspaceId: string) {
    return this.repo.findPaginated(parsed, workspaceId)
  }
}
