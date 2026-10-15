import { Service, Inject, HttpException } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/constants/error-codes'
import {
  WORKSPACE_MEMBER_REPOSITORY,
  type WorkspaceMemberRepository,
} from '@/modules/workspaces/workspace-member.repository'
import {
  WORKSPACE_REPOSITORY,
  type WorkspaceRepository,
} from '@/modules/workspaces/workspace.repository'

@Service()
export class RemoveMemberUseCase {
  constructor(
    @Inject(WORKSPACE_MEMBER_REPOSITORY)
    private readonly memberRepo: WorkspaceMemberRepository,
    @Inject(WORKSPACE_REPOSITORY)
    private readonly workspaceRepo: WorkspaceRepository,
  ) {}

  async execute(workspaceId: string, userId: string) {
    const workspace = await this.workspaceRepo.findById(workspaceId)
    if (workspace && workspace.ownerId === userId) {
      throw HttpException.forbidden(ErrorCode.CANNOT_REMOVE_OWNER)
    }

    await this.memberRepo.remove(workspaceId, userId)
  }
}
