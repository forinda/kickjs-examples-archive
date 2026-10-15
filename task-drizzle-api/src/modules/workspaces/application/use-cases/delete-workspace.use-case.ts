import { Service, Inject } from '@forinda/kickjs'
import {
  WORKSPACE_REPOSITORY,
  type WorkspaceRepository,
} from '@/modules/workspaces/workspace.repository'

@Service()
export class DeleteWorkspaceUseCase {
  constructor(
    @Inject(WORKSPACE_REPOSITORY)
    private readonly repo: WorkspaceRepository,
  ) {}

  async execute(id: string) {
    await this.repo.delete(id)
  }
}
