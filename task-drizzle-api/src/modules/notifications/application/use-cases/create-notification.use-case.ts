import { Service, Inject } from '@forinda/kickjs'
import type { CreateNotificationDTO } from '../dtos/create-notification.dto'
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '@/modules/notifications/notification.repository'

@Service()
export class CreateNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: NotificationRepository,
  ) {}

  async execute(dto: CreateNotificationDTO) {
    return this.repo.create(dto)
  }
}
