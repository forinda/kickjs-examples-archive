import type { DrizzleQueryParamsConfig } from '@/shared/infrastructure/query-adapter'
import { notifications } from '@/db/schema'

export const NOTIFICATION_QUERY_CONFIG: DrizzleQueryParamsConfig = {
  columns: {
    recipientId: notifications.recipientId,
    type: notifications.type,
    isRead: notifications.isRead,
  },
  sortable: {
    createdAt: notifications.createdAt,
  },
  searchColumns: [notifications.title, notifications.body],
}
