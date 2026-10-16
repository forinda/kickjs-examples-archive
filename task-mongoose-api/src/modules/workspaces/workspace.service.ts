import {
  Service,
  Inject,
  HttpException,
  Logger,
  JOB_DISPATCHER,
  type JobDispatcher,
} from '@forinda/kickjs'
import { ErrorCode } from '@/shared/error-codes'
import type { CreateWorkspaceDto, InviteMemberDto, UpdateWorkspaceDto } from './workspace.dto'
import { WORKSPACE_REPOSITORY, type WorkspaceRepository } from './workspace.repository'
import {
  WORKSPACE_MEMBER_REPOSITORY,
  type WorkspaceMemberRepository,
} from './workspace-member.repository'
import { USER_REPOSITORY, type UserRepository } from '@/modules/users/user.repository'

const logger = Logger.for('WorkspacesService')

@Service()
export class WorkspacesService {
  constructor(
    @Inject(WORKSPACE_REPOSITORY) private workspaceRepo: WorkspaceRepository,
    @Inject(WORKSPACE_MEMBER_REPOSITORY) private memberRepo: WorkspaceMemberRepository,
    @Inject(USER_REPOSITORY) private userRepo: UserRepository,
    @Inject(JOB_DISPATCHER) private jobs: JobDispatcher,
  ) {}

  async create(userId: string, dto: CreateWorkspaceDto) {
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

  async update(workspaceId: string, dto: UpdateWorkspaceDto) {
    const workspace = await this.workspaceRepo.update(workspaceId, dto)
    if (!workspace) {
      throw HttpException.notFound(ErrorCode.WORKSPACE_NOT_FOUND)
    }
    return workspace
  }

  async delete(workspaceId: string) {
    const deleted = await this.workspaceRepo.delete(workspaceId)
    if (!deleted) {
      throw HttpException.notFound(ErrorCode.WORKSPACE_NOT_FOUND)
    }
  }

  /**
   * Adds the account with this email to the workspace and queues the invite
   * email. Resolves the same way whether the email has an account, is already
   * a member, or is unknown — the caller can't use invites to probe which
   * emails are registered.
   */
  async inviteMember(workspaceId: string, dto: InviteMemberDto): Promise<void> {
    const user = await this.userRepo.findByEmail(dto.email)
    // ponytail: no account → nothing happens; a sign-up invite (pending invite + email) belongs here.
    if (!user) return

    const existing = await this.memberRepo.findByUserAndWorkspace(user._id.toString(), workspaceId)
    if (existing) return

    const workspace = await this.workspaceRepo.findById(workspaceId)

    await this.memberRepo.create({
      workspaceId: workspaceId as any,
      userId: user._id,
      role: dto.role,
      joinedAt: new Date(),
    })

    // Queue invite email
    try {
      await this.jobs.dispatch('email', 'send-workspace-invite', {
        email: user.email,
        workspaceName: workspace?.name ?? 'Workspace',
        inviterName: dto.email,
      })
    } catch {
      logger.warn('Failed to queue workspace invite email')
    }
  }

  async updateMemberRole(workspaceId: string, userId: string, role: 'admin' | 'member') {
    await this.assertNotOwner(workspaceId, userId)

    const member = await this.memberRepo.findByUserAndWorkspace(userId, workspaceId)
    if (!member) {
      throw HttpException.notFound(ErrorCode.NOT_WORKSPACE_MEMBER)
    }

    return this.memberRepo.updateRole(member._id.toString(), role)
  }

  async removeMember(workspaceId: string, userId: string) {
    await this.assertNotOwner(workspaceId, userId)

    const deleted = await this.memberRepo.deleteByUserAndWorkspace(userId, workspaceId)
    if (!deleted) {
      throw HttpException.notFound(ErrorCode.NOT_WORKSPACE_MEMBER)
    }
  }

  async leave(workspaceId: string, userId: string) {
    await this.assertNotOwner(workspaceId, userId)

    await this.memberRepo.deleteByUserAndWorkspace(userId, workspaceId)
  }

  /** 404 when the workspace is missing, 403 when `userId` is its owner. */
  private async assertNotOwner(workspaceId: string, userId: string) {
    const workspace = await this.workspaceRepo.findById(workspaceId)
    if (!workspace) {
      throw HttpException.notFound(ErrorCode.WORKSPACE_NOT_FOUND)
    }

    if (workspace.ownerId.toString() === userId) {
      throw HttpException.forbidden(ErrorCode.CANNOT_REMOVE_OWNER)
    }
  }
}
