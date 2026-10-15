import { Service, Inject, HttpException } from '@forinda/kickjs'
import { CHANNEL_REPOSITORY, type ChannelRepository } from './channel.repository'
import {
  CHANNEL_MEMBER_REPOSITORY,
  type ChannelMemberRepository,
} from './channel-member.repository'
import type { CreateChannelDTO } from './channel.dto'

@Service()
export class ChannelService {
  constructor(
    @Inject(CHANNEL_REPOSITORY)
    private readonly repo: ChannelRepository,
    @Inject(CHANNEL_MEMBER_REPOSITORY)
    private readonly memberRepo: ChannelMemberRepository,
  ) {}

  async create(dto: CreateChannelDTO, createdById: string) {
    const channel = await this.repo.create({ ...dto, createdById })
    await this.memberRepo.addMember(channel.id, createdById)
    return channel
  }

  async addMember(channelId: string, userId: string) {
    const existing = await this.memberRepo.findByChannelAndUser(channelId, userId)
    if (existing) throw HttpException.conflict('User is already a member')
    return this.memberRepo.addMember(channelId, userId)
  }
}
