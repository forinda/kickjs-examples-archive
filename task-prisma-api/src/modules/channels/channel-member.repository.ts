import { createToken } from '@forinda/kickjs'
import type { PrismaClient } from '@/generated/prisma/client'

export function createChannelMemberRepository(prisma: PrismaClient) {
  return {
    async findByChannelAndUser(channelId: string, userId: string) {
      return prisma.channelMember.findUnique({
        where: { channelId_userId: { channelId, userId } },
      })
    },

    async listMembers(channelId: string) {
      return prisma.channelMember.findMany({ where: { channelId } })
    },

    async addMember(channelId: string, userId: string) {
      return prisma.channelMember.create({ data: { channelId, userId } })
    },

    async removeMember(channelId: string, userId: string) {
      await prisma.channelMember.delete({
        where: { channelId_userId: { channelId, userId } },
      })
    },
  }
}

export type ChannelMemberRepository = ReturnType<typeof createChannelMemberRepository>

export const CHANNEL_MEMBER_REPOSITORY = createToken<ChannelMemberRepository>(
  'app/ChannelMember/repository',
)
