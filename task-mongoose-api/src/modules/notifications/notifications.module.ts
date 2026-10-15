import { defineModule } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'
import { MongoNotificationRepository } from './infrastructure/repositories/mongo-notification.repository'
import { NotificationsController } from './presentation/notifications.controller'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const NotificationsModule = defineModule({
  name: 'NotificationsModule',
  build: () => ({
    register(container) {
      container.registerFactory(TOKENS.NOTIFICATION_REPOSITORY, () =>
        container.resolve(MongoNotificationRepository),
      )
    },
    routes: () => ({ path: '/notifications', controller: NotificationsController }),
  }),
})
