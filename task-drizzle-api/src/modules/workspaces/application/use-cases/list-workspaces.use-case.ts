import { Service, Inject } from '@forinda/kickjs'
import {
  WORKSPACE_REPOSITORY,
  type WorkspaceRepository,
} from '@/modules/workspaces/workspace.repository'

@Service()
export class ListWorkspacesUseCase {
  constructor(
    @Inject(WORKSPACE_REPOSITORY)
    private readonly repo: WorkspaceRepository,
  ) {}

  async executeForUser(userId: string) {
    return this.repo.findForUser(userId)
  }
}
