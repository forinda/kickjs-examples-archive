import { Service, Inject } from '@forinda/kickjs'
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '@/modules/notifications/notification.repository'

@Service()
export class MarkNotificationReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: NotificationRepository,
  ) {}

  async execute(id: string) {
    await this.repo.markRead(id)
  }
}
