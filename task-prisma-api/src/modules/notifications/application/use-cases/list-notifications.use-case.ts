import { Service, Inject } from '@forinda/kickjs'
import type { ParsedQuery } from '@forinda/kickjs'
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '@/modules/notifications/notification.repository'

@Service()
export class ListNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: NotificationRepository,
  ) {}

  async execute(parsed: ParsedQuery, recipientId: string) {
    return this.repo.findPaginated(parsed, recipientId)
  }
}
