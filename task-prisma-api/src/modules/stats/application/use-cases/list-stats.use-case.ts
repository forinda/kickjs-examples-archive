import { Service, Inject } from '@forinda/kickjs'
import { STATS_REPOSITORY, type StatsRepository } from '@/modules/stats/stats.repository'

@Service()
export class GetProjectStatsUseCase {
  constructor(@Inject(STATS_REPOSITORY) private readonly repo: StatsRepository) {}

  async execute(projectId: string) {
    return this.repo.getProjectStats(projectId)
  }
}
