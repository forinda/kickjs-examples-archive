import { Service, Inject } from '@forinda/kickjs'
import {
  WORKSPACE_REPOSITORY,
  type WorkspaceRepository,
} from '@/modules/workspaces/workspace.repository'

@Service()
export class GetWorkspaceUseCase {
  constructor(
    @Inject(WORKSPACE_REPOSITORY)
    private readonly repo: WorkspaceRepository,
  ) {}

  async execute(id: string) {
    return this.repo.findById(id)
  }
}
