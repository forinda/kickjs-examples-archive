import { Service, Inject, HttpException } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/constants/error-codes'
import type { UpdateWorkspaceDto } from '../dtos/update-workspace.dto'
import {
  WORKSPACE_REPOSITORY,
  type WorkspaceRepository,
} from '@/modules/workspaces/infrastructure/repositories/workspace.repository'

@Service()
export class UpdateWorkspaceUseCase {
  constructor(@Inject(WORKSPACE_REPOSITORY) private workspaceRepo: WorkspaceRepository) {}

  async execute(workspaceId: string, dto: UpdateWorkspaceDto) {
    const workspace = await this.workspaceRepo.update(workspaceId, dto)
    if (!workspace) {
      throw HttpException.notFound(ErrorCode.WORKSPACE_NOT_FOUND)
    }
    return workspace
  }
}
