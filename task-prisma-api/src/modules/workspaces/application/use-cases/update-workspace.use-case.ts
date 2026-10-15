import { Service, Inject } from '@forinda/kickjs'
import type { UpdateWorkspaceDTO } from '../dtos/update-workspace.dto'
import {
  WORKSPACE_REPOSITORY,
  type WorkspaceRepository,
} from '@/modules/workspaces/workspace.repository'

@Service()
export class UpdateWorkspaceUseCase {
  constructor(
    @Inject(WORKSPACE_REPOSITORY)
    private readonly repo: WorkspaceRepository,
  ) {}

  async execute(id: string, dto: UpdateWorkspaceDTO) {
    return this.repo.update(id, dto)
  }
}
