import { createToken, type ParsedQuery } from '@forinda/kickjs'
import { and, eq, sql } from 'drizzle-orm'
import type { AppDatabase } from '@/db'
import { notifications } from '@/db/schema'
import { NOTIFICATION_QUERY_CONFIG } from './notification.constants'
import { queryAdapter } from '@/shared/query-adapter'

export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert

export function createNotificationRepository(db: AppDatabase) {
  return {
    async findById(id: string): Promise<Notification | null> {
      const [notification] = await db.select().from(notifications).where(eq(notifications.id, id))
      return notification ?? null
    },

    async findPaginated(
      parsed: ParsedQuery,
      recipientId: string,
    ): Promise<{ data: Notification[]; total: number }> {
      const query = queryAdapter.buildFromColumns(parsed, {
        ...NOTIFICATION_QUERY_CONFIG,
        baseCondition: eq(notifications.recipientId, recipientId),
      })

      const [data, countResult] = await Promise.all([
        db
          .select()
          .from(notifications)
          .where(query.where)
          .orderBy(...query.orderBy)
          .limit(query.limit)
          .offset(query.offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(notifications)
          .where(query.where),
      ])

      return { data, total: countResult[0]?.count ?? 0 }
    },

    async create(data: NewNotification): Promise<Notification> {
      const [notification] = await db.insert(notifications).values(data).returning()
      return notification
    },

    /** Only the recipient's own notification — someone else's id is a no-op. */
    async markRead(id: string, recipientId: string): Promise<void> {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, id), eq(notifications.recipientId, recipientId)))
    },

    async markAllRead(recipientId: string): Promise<void> {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.recipientId, recipientId), eq(notifications.isRead, false)))
    },

    async unreadCount(recipientId: string): Promise<number> {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(eq(notifications.recipientId, recipientId), eq(notifications.isRead, false)))
      return result?.count ?? 0
    },

    async delete(id: string): Promise<void> {
      await db.delete(notifications).where(eq(notifications.id, id))
    },
  }
}

export type NotificationRepository = ReturnType<typeof createNotificationRepository>

export const NOTIFICATION_REPOSITORY = createToken<NotificationRepository>(
  'app/Notification/repository',
)
