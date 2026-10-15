import { Service, Inject } from '@forinda/kickjs'
import type { CreateChannelDTO } from '../dtos/create-channel.dto'
import { CHANNEL_REPOSITORY, type ChannelRepository } from '@/modules/channels/channel.repository'
import {
  CHANNEL_MEMBER_REPOSITORY,
  type ChannelMemberRepository,
} from '@/modules/channels/channel-member.repository'

@Service()
export class CreateChannelUseCase {
  constructor(
    @Inject(CHANNEL_REPOSITORY)
    private readonly repo: ChannelRepository,
    @Inject(CHANNEL_MEMBER_REPOSITORY)
    private readonly memberRepo: ChannelMemberRepository,
  ) {}

  async execute(dto: CreateChannelDTO, createdById: string) {
    const channel = await this.repo.create({ ...dto, createdById })
    await this.memberRepo.addMember(channel.id, createdById)
    return channel
  }
}
