import { Service, Inject, type ParsedQuery } from '@forinda/kickjs'
import {
  ACTIVITY_REPOSITORY,
  type ActivityRepository,
} from '@/modules/activities/activity.repository'

@Service()
export class ListActivitiesUseCase {
  constructor(@Inject(ACTIVITY_REPOSITORY) private readonly repo: ActivityRepository) {}

  async execute(
    parsed: ParsedQuery,
    scope: { workspaceId: string; projectId?: string; taskId?: string },
  ) {
    return this.repo.findPaginated(parsed, scope)
  }
}
