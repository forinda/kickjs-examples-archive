import { defineModule } from '@forinda/kickjs'
import { DRIZZLE_DB } from '@/db'
import {
  createNotificationRepository,
  NOTIFICATION_REPOSITORY,
} from './notification.repository'
import { NotificationController } from './notification.controller'

export const NotificationModule = defineModule({
  name: 'NotificationModule',
  build: () => ({
    register(container) {
      container.registerFactory(NOTIFICATION_REPOSITORY, () =>
        createNotificationRepository(container.resolve(DRIZZLE_DB)),
      )
    },
    routes: () => ({ path: '/notifications', controller: NotificationController }),
  }),
})
