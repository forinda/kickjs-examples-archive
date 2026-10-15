import { createToken, HttpException, type ParsedQuery } from '@forinda/kickjs'
import { and, desc, eq, lt, sql } from 'drizzle-orm'
import type { AppDatabase } from '@/db'
import { messages } from '@/db/schema'
import { MESSAGE_QUERY_CONFIG } from './message.constants'
import { queryAdapter } from '@/shared/query-adapter'

export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert

export function createMessageRepository(db: AppDatabase) {
  return {
    async findById(id: string): Promise<Message | null> {
      const [message] = await db.select().from(messages).where(eq(messages.id, id))
      return message ?? null
    },

    async findByChannel(channelId: string, cursor?: string, limit = 50): Promise<Message[]> {
      const conditions = [eq(messages.channelId, channelId)]
      if (cursor) {
        conditions.push(lt(messages.createdAt, new Date(cursor)))
      }

      return db
        .select()
        .from(messages)
        .where(and(...conditions))
        .orderBy(desc(messages.createdAt))
        .limit(limit)
    },

    async findPaginated(
      parsed: ParsedQuery,
      channelId: string,
    ): Promise<{ data: Message[]; total: number }> {
      const query = queryAdapter.buildFromColumns(parsed, {
        ...MESSAGE_QUERY_CONFIG,
        baseCondition: eq(messages.channelId, channelId),
      })

      const [data, countResult] = await Promise.all([
        db
          .select()
          .from(messages)
          .where(query.where)
          .orderBy(...query.orderBy)
          .limit(query.limit)
          .offset(query.offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(query.where),
      ])

      return { data, total: countResult[0]?.count ?? 0 }
    },

    async create(data: NewMessage): Promise<Message> {
      const [message] = await db.insert(messages).values(data).returning()
      return message
    },

    async update(id: string, data: Partial<NewMessage>): Promise<Message> {
      const [message] = await db
        .update(messages)
        .set({ ...data, isEdited: true })
        .where(eq(messages.id, id))
        .returning()
      if (!message) throw HttpException.notFound('Message not found')
      return message
    },

    async delete(id: string): Promise<void> {
      await db.delete(messages).where(eq(messages.id, id))
    },
  }
}

export type MessageRepository = ReturnType<typeof createMessageRepository>

export const MESSAGE_REPOSITORY = createToken<MessageRepository>('app/Message/repository')
