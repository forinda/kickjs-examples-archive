import { createToken, HttpException, type ParsedQuery } from '@forinda/kickjs'
import { eq, sql } from 'drizzle-orm'
import type { AppDatabase } from '@/db'
import { channels, type channelMembers } from '@/db/schema'
import { CHANNEL_QUERY_CONFIG } from './channel.constants'
import { queryAdapter } from '@/shared/query-adapter'

export type Channel = typeof channels.$inferSelect
export type NewChannel = typeof channels.$inferInsert
export type ChannelMember = typeof channelMembers.$inferSelect

export function createChannelRepository(db: AppDatabase) {
  return {
    async findById(id: string): Promise<Channel | null> {
      const [channel] = await db.select().from(channels).where(eq(channels.id, id))
      return channel ?? null
    },

    async findPaginated(
      parsed: ParsedQuery,
      workspaceId: string,
    ): Promise<{ data: Channel[]; total: number }> {
      const query = queryAdapter.buildFromColumns(parsed, {
        ...CHANNEL_QUERY_CONFIG,
        baseCondition: eq(channels.workspaceId, workspaceId),
      })

      const [data, countResult] = await Promise.all([
        db
          .select()
          .from(channels)
          .where(query.where)
          .orderBy(...query.orderBy)
          .limit(query.limit)
          .offset(query.offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(channels)
          .where(query.where),
      ])

      return { data, total: countResult[0]?.count ?? 0 }
    },

    async create(data: NewChannel): Promise<Channel> {
      const [channel] = await db.insert(channels).values(data).returning()
      return channel
    },

    async update(id: string, data: Partial<NewChannel>): Promise<Channel> {
      const [channel] = await db.update(channels).set(data).where(eq(channels.id, id)).returning()
      if (!channel) throw HttpException.notFound('Channel not found')
      return channel
    },

    async delete(id: string): Promise<void> {
      await db.delete(channels).where(eq(channels.id, id))
    },
  }
}

export type ChannelRepository = ReturnType<typeof createChannelRepository>

export const CHANNEL_REPOSITORY = createToken<ChannelRepository>('app/Channel/repository')
