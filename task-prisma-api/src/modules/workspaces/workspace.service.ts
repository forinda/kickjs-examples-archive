import { Service, Inject, HttpException } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/error-codes'
import type { CreateWorkspaceDTO, InviteMemberDTO } from './workspace.dto'
import {
  WORKSPACE_MEMBER_REPOSITORY,
  type WorkspaceMemberRepository,
} from './workspace-member.repository'
import { WORKSPACE_REPOSITORY, type WorkspaceRepository } from './workspace.repository'
import { USER_REPOSITORY, type UserRepository } from '@/modules/users/user.repository'

@Service()
export class WorkspaceService {
  constructor(
    @Inject(WORKSPACE_REPOSITORY)
    private readonly repo: WorkspaceRepository,
    @Inject(WORKSPACE_MEMBER_REPOSITORY)
    private readonly memberRepo: WorkspaceMemberRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
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

  /**
   * Records a pending invite for the account with this email. The invitee is
   * not a member — sees nothing and is seen by no one — until they accept.
   * Resolves the same way whether the email has an account, is already a
   * member or invited, or is unknown, so invites can't probe which emails
   * are registered.
   */
  async inviteMember(workspaceId: string, dto: InviteMemberDTO): Promise<void> {
    const user = await this.userRepo.findByEmail(dto.email)
    // ponytail: no account → nothing happens; a sign-up invite (token + email) belongs here.
    if (!user) return
    if (await this.memberRepo.findAnyByWorkspaceAndUser(workspaceId, user.id)) return

    await this.memberRepo.add({ workspaceId, userId: user.id, role: dto.role, status: 'pending' })
  }

  /** `userId` accepts their pending invite. 404 when there is none (or no such workspace). */
  async acceptInvite(workspaceId: string, userId: string): Promise<void> {
    if (!(await this.memberRepo.acceptInvite(workspaceId, userId))) {
      throw HttpException.notFound(ErrorCode.INVITE_NOT_FOUND)
    }
  }

  /** `userId` declines their pending invite. 404 when there is none. */
  async declineInvite(workspaceId: string, userId: string): Promise<void> {
    if (!(await this.memberRepo.declineInvite(workspaceId, userId))) {
      throw HttpException.notFound(ErrorCode.INVITE_NOT_FOUND)
    }
  }

  async updateMemberRole(workspaceId: string, userId: string, role: string) {
    await this.ensureNotOwner(workspaceId, userId)
    return this.memberRepo.updateRole(workspaceId, userId, role)
  }

  /** Remove a member (or let a member leave). The owner can never be removed. */
  async removeMember(workspaceId: string, userId: string) {
    await this.ensureNotOwner(workspaceId, userId)
    await this.memberRepo.remove(workspaceId, userId)
  }

  private async ensureNotOwner(workspaceId: string, userId: string) {
    const workspace = await this.repo.findById(workspaceId)
    if (workspace && workspace.ownerId === userId) {
      throw HttpException.forbidden(ErrorCode.CANNOT_REMOVE_OWNER)
    }
  }
}
