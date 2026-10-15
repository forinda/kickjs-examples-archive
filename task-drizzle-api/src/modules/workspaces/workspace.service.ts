import { Service, Inject, HttpException } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/error-codes'
import type { CreateWorkspaceDTO, InviteMemberDTO } from './workspace.dto'
import {
  WORKSPACE_MEMBER_REPOSITORY,
  type WorkspaceMemberRepository,
} from './workspace-member.repository'
import { WORKSPACE_REPOSITORY, type WorkspaceRepository } from './workspace.repository'

@Service()
export class WorkspaceService {
  constructor(
    @Inject(WORKSPACE_REPOSITORY)
    private readonly repo: WorkspaceRepository,
    @Inject(WORKSPACE_MEMBER_REPOSITORY)
    private readonly memberRepo: WorkspaceMemberRepository,
  ) {}

  async create(dto: CreateWorkspaceDTO, ownerId: string) {
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

  async inviteMember(workspaceId: string, dto: InviteMemberDTO) {
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

  async updateMemberRole(workspaceId: string, userId: string, role: string) {
    await this.assertNotOwner(workspaceId, userId)
    return this.memberRepo.updateRole(workspaceId, userId, role)
  }

  /** Remove a member (or leave). The workspace owner can't be removed. */
  async removeMember(workspaceId: string, userId: string) {
    await this.assertNotOwner(workspaceId, userId)
    await this.memberRepo.remove(workspaceId, userId)
  }

  private async assertNotOwner(workspaceId: string, userId: string) {
    const workspace = await this.repo.findById(workspaceId)
    if (workspace && workspace.ownerId === userId) {
      throw HttpException.forbidden(ErrorCode.CANNOT_REMOVE_OWNER)
    }
  }
}
