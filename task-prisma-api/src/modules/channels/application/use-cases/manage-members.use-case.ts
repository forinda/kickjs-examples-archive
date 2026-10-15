import { Service, Inject, HttpException } from '@forinda/kickjs'
import {
  CHANNEL_MEMBER_REPOSITORY,
  type ChannelMemberRepository,
} from '@/modules/channels/channel-member.repository'

@Service()
export class ManageChannelMembersUseCase {
  constructor(
    @Inject(CHANNEL_MEMBER_REPOSITORY)
    private readonly memberRepo: ChannelMemberRepository,
  ) {}

  async listMembers(channelId: string) {
    return this.memberRepo.listMembers(channelId)
  }

  async addMember(channelId: string, userId: string) {
    const existing = await this.memberRepo.findByChannelAndUser(channelId, userId)
    if (existing) throw HttpException.conflict('User is already a member')
    return this.memberRepo.addMember(channelId, userId)
  }

  async removeMember(channelId: string, userId: string) {
    await this.memberRepo.removeMember(channelId, userId)
  }
}
