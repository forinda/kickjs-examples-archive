import { createToken } from '@forinda/kickjs'
import { and, eq } from 'drizzle-orm'
import type { AppDatabase } from '@/db'
import { channelMembers } from '@/db/schema'
import type { ChannelMember } from './channel.repository'

export function createChannelMemberRepository(db: AppDatabase) {
  return {
    async findByChannelAndUser(channelId: string, userId: string): Promise<ChannelMember | null> {
      const [member] = await db
        .select()
        .from(channelMembers)
        .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userId, userId)))
      return member ?? null
    },

    async listMembers(channelId: string): Promise<ChannelMember[]> {
      return db.select().from(channelMembers).where(eq(channelMembers.channelId, channelId))
    },

    async addMember(channelId: string, userId: string): Promise<ChannelMember> {
      const [member] = await db.insert(channelMembers).values({ channelId, userId }).returning()
      return member
    },

    async removeMember(channelId: string, userId: string): Promise<void> {
      await db
        .delete(channelMembers)
        .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userId, userId)))
    },
  }
}

export type ChannelMemberRepository = ReturnType<typeof createChannelMemberRepository>

export const CHANNEL_MEMBER_REPOSITORY = createToken<ChannelMemberRepository>(
  'app/ChannelMember/repository',
)
