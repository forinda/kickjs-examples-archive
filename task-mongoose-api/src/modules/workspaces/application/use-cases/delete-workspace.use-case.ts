import { Service, Inject, HttpException } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/constants/error-codes'
import {
  WORKSPACE_REPOSITORY,
  type WorkspaceRepository,
} from '@/modules/workspaces/infrastructure/repositories/workspace.repository'

@Service()
export class DeleteWorkspaceUseCase {
  constructor(@Inject(WORKSPACE_REPOSITORY) private workspaceRepo: WorkspaceRepository) {}

  async execute(workspaceId: string) {
    const deleted = await this.workspaceRepo.delete(workspaceId)
    if (!deleted) {
      throw HttpException.notFound(ErrorCode.WORKSPACE_NOT_FOUND)
    }
  }
}
