import { createToken } from '@forinda/kickjs'
import type { Connection } from 'mongoose'
import { bindModel } from '@/db/bind-model'
import {
  type NotificationEntity,
  NotificationModel as NotificationModelDef,
} from './notification.schema'
import { buildMongoFilter, buildMongoSort } from '@/db/query-helpers'

/** Mongo-backed Notification repository. `connection` is the one MongooseAdapter registers under MONGO_CONNECTION. */
export function createNotificationRepository(connection: Connection) {
  const NotificationModel = bindModel(connection, NotificationModelDef)

  return {
    async findById(id: string): Promise<NotificationEntity | null> {
      return NotificationModel.findById(id).lean() as any
    },

    async findByRecipient(
      recipientId: string,
      parsed: any,
    ): Promise<{ data: NotificationEntity[]; total: number }> {
      const { filters = [], sort = [], pagination = { page: 1, limit: 20, offset: 0 } } = parsed

      const mongoFilter = {
        recipientId,
        ...buildMongoFilter(filters),
      }
      const mongoSort = buildMongoSort(sort)

      const [data, total] = await Promise.all([
        NotificationModel.find(mongoFilter)
          .sort(mongoSort)
          .skip(pagination.offset)
          .limit(pagination.limit)
          .lean(),
        NotificationModel.countDocuments(mongoFilter),
      ])

      return { data: data as any[], total }
    },

    async create(data: Partial<NotificationEntity>): Promise<NotificationEntity> {
      const doc = await NotificationModel.create(data)
      return doc.toObject() as any
    },

    /** Only the recipient's own notification — someone else's id is a no-op. */
    async markAsRead(id: string, recipientId: string) {
      await NotificationModel.updateOne({ _id: id, recipientId }, { $set: { isRead: true } })
    },

    async markAllAsRead(recipientId: string) {
      await NotificationModel.updateMany({ recipientId, isRead: false }, { $set: { isRead: true } })
    },

    async countUnread(recipientId: string): Promise<number> {
      return NotificationModel.countDocuments({ recipientId, isRead: false })
    },
  }
}

export type NotificationRepository = ReturnType<typeof createNotificationRepository>

export const NOTIFICATION_REPOSITORY = createToken<NotificationRepository>(
  'app/Notification/repository',
)
