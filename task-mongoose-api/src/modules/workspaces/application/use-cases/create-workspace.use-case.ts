import { Service, Inject, HttpException } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/constants/error-codes'
import type { CreateWorkspaceDto } from '../dtos/create-workspace.dto'
import {
  WORKSPACE_MEMBER_REPOSITORY,
  type WorkspaceMemberRepository,
} from '@/modules/workspaces/infrastructure/repositories/workspace-member.repository'
import {
  WORKSPACE_REPOSITORY,
  type WorkspaceRepository,
} from '@/modules/workspaces/infrastructure/repositories/workspace.repository'

@Service()
export class CreateWorkspaceUseCase {
  constructor(
    @Inject(WORKSPACE_REPOSITORY) private workspaceRepo: WorkspaceRepository,
    @Inject(WORKSPACE_MEMBER_REPOSITORY) private memberRepo: WorkspaceMemberRepository,
  ) {}

  async execute(userId: string, dto: CreateWorkspaceDto) {
    const existing = await this.workspaceRepo.findBySlug(dto.slug)
    if (existing) {
      throw HttpException.conflict(ErrorCode.WORKSPACE_SLUG_EXISTS)
    }

    const workspace = await this.workspaceRepo.create({
      ...dto,
      ownerId: userId as any,
    })

    // Owner becomes admin
    await this.memberRepo.create({
      workspaceId: workspace._id,
      userId: userId as any,
      role: 'admin',
      joinedAt: new Date(),
    })

    return workspace
  }
}
