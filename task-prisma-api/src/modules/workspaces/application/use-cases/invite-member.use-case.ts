import { Service, Inject, HttpException } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/constants/error-codes'
import type { InviteMemberDTO } from '../dtos/invite-member.dto'
import {
  WORKSPACE_MEMBER_REPOSITORY,
  type WorkspaceMemberRepository,
} from '@/modules/workspaces/workspace-member.repository'

@Service()
export class InviteMemberUseCase {
  constructor(
    @Inject(WORKSPACE_MEMBER_REPOSITORY)
    private readonly memberRepo: WorkspaceMemberRepository,
  ) {}

  async execute(workspaceId: string, dto: InviteMemberDTO) {
    const existing = await this.memberRepo.findByWorkspaceAndUser(workspaceId, dto.userId)
    if (existing) {
      throw HttpException.conflict(ErrorCode.ALREADY_WORKSPACE_MEMBER)
    }

    return this.memberRepo.add({
      workspaceId,
      userId: dto.userId,
      role: dto.role,
    })
  }
}
