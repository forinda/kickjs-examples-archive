import { Service, Inject } from '@forinda/kickjs'
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '@/modules/notifications/notification.repository'

@Service()
export class MarkAllNotificationsReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: NotificationRepository,
  ) {}

  async execute(recipientId: string) {
    await this.repo.markAllRead(recipientId)
  }
}
