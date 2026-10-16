import { defineModule } from '@forinda/kickjs'
import { NotificationsController } from './notification.controller'
import {
  NOTIFICATION_REPOSITORY,
  createNotificationRepository,
} from './notification.repository'
import { MONGO_CONNECTION } from '@/adapters/mongoose.adapter'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const NotificationsModule = defineModule({
  name: 'NotificationsModule',
  build: () => ({
    register(container) {
      container.registerFactory(NOTIFICATION_REPOSITORY, () =>
        createNotificationRepository(container.resolve(MONGO_CONNECTION)),
      )
    },
    routes: () => ({ path: '/notifications', controller: NotificationsController }),
  }),
})
