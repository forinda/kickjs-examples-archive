import { Service, Inject } from '@forinda/kickjs'
import type { CreateActivityDTO } from '../dtos/create-activity.dto'
import {
  ACTIVITY_REPOSITORY,
  type ActivityRepository,
} from '@/modules/activities/activity.repository'

@Service()
export class CreateActivityUseCase {
  constructor(@Inject(ACTIVITY_REPOSITORY) private readonly repo: ActivityRepository) {}

  async execute(dto: CreateActivityDTO, actorId: string) {
    return this.repo.create({ ...dto, actorId })
  }
}
