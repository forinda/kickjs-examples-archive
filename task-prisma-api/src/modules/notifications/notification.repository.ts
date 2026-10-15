import { createToken } from '@forinda/kickjs'
import type { PrismaClient } from '@/generated/prisma/client'
import type { ParsedQuery } from '@forinda/kickjs'
import { queryAdapter } from '@/shared/query-adapter'
import type { Notification } from '@/generated/prisma/client'

export type { Notification }
export type NewNotification = {
  recipientId: string
  type: any
  title: string
  body: string
  metadata?: any
}

export function createNotificationRepository(prisma: PrismaClient) {
  return {
    async findById(id: string) {
      return prisma.notification.findUnique({ where: { id } })
    },

    async findPaginated(parsed: ParsedQuery, recipientId: string) {
      const query = queryAdapter.build(parsed, { searchColumns: ['title', 'body'] })
      const where = query.where ? { AND: [query.where, { recipientId }] } : { recipientId }

      const [data, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: query.orderBy,
          skip: query.skip,
          take: query.take,
        }),
        prisma.notification.count({ where }),
      ])

      return { data, total }
    },

    async create(data: NewNotification) {
      return prisma.notification.create({ data: data as any })
    },

    async markRead(id: string) {
      await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      })
    },

    async markAllRead(recipientId: string) {
      await prisma.notification.updateMany({
        where: { recipientId, isRead: false },
        data: { isRead: true },
      })
    },

    async unreadCount(recipientId: string) {
      return prisma.notification.count({
        where: { recipientId, isRead: false },
      })
    },

    async delete(id: string) {
      await prisma.notification.delete({ where: { id } })
    },
  }
}

export type NotificationRepository = ReturnType<typeof createNotificationRepository>

export const NOTIFICATION_REPOSITORY = createToken<NotificationRepository>(
  'app/Notification/repository',
)
