import { Service, Inject, HttpException } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/constants/error-codes'
import type { CreateWorkspaceDTO } from '../dtos/create-workspace.dto'
import {
  WORKSPACE_REPOSITORY,
  type WorkspaceRepository,
} from '@/modules/workspaces/workspace.repository'
import {
  WORKSPACE_MEMBER_REPOSITORY,
  type WorkspaceMemberRepository,
} from '@/modules/workspaces/workspace-member.repository'

@Service()
export class CreateWorkspaceUseCase {
  constructor(
    @Inject(WORKSPACE_REPOSITORY)
    private readonly repo: WorkspaceRepository,
    @Inject(WORKSPACE_MEMBER_REPOSITORY)
    private readonly memberRepo: WorkspaceMemberRepository,
  ) {}

  async execute(dto: CreateWorkspaceDTO, ownerId: string) {
    const existing = await this.repo.findBySlug(dto.slug)
    if (existing) {
      throw HttpException.conflict(ErrorCode.WORKSPACE_SLUG_EXISTS)
    }

    const workspace = await this.repo.create({ ...dto, ownerId })

    // Add owner as admin member
    await this.memberRepo.add({
      workspaceId: workspace.id,
      userId: ownerId,
      role: 'admin',
    })

    return workspace
  }
}
