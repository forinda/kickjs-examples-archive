import { Service, Inject } from '@forinda/kickjs'
import { STATS_REPOSITORY, type StatsRepository } from '@/modules/stats/stats.repository'

@Service()
export class GetWorkspaceStatsUseCase {
  constructor(@Inject(STATS_REPOSITORY) private readonly repo: StatsRepository) {}

  async execute(workspaceId: string) {
    return this.repo.getWorkspaceStats(workspaceId)
  }
}
