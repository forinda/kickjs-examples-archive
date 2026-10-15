import { Service, Inject, HttpException } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/constants/error-codes'
import {
  WORKSPACE_MEMBER_REPOSITORY,
  type WorkspaceMemberRepository,
} from '@/modules/workspaces/infrastructure/repositories/workspace-member.repository'
import {
  WORKSPACE_REPOSITORY,
  type WorkspaceRepository,
} from '@/modules/workspaces/infrastructure/repositories/workspace.repository'

@Service()
export class RemoveMemberUseCase {
  constructor(
    @Inject(WORKSPACE_MEMBER_REPOSITORY) private memberRepo: WorkspaceMemberRepository,
    @Inject(WORKSPACE_REPOSITORY) private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute(workspaceId: string, userId: string) {
    const workspace = await this.workspaceRepo.findById(workspaceId)
    if (!workspace) {
      throw HttpException.notFound(ErrorCode.WORKSPACE_NOT_FOUND)
    }

    if (workspace.ownerId.toString() === userId) {
      throw HttpException.forbidden(ErrorCode.CANNOT_REMOVE_OWNER)
    }

    const deleted = await this.memberRepo.deleteByUserAndWorkspace(userId, workspaceId)
    if (!deleted) {
      throw HttpException.notFound(ErrorCode.NOT_WORKSPACE_MEMBER)
    }
  }
}
