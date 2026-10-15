import { Service, Inject, HttpException, Logger } from '@forinda/kickjs'
import { JOB_DISPATCHER, type JobDispatcher } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/constants/error-codes'
import type { InviteMemberDto } from '../dtos/invite-member.dto'
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@/modules/users/infrastructure/repositories/user.repository'
import {
  WORKSPACE_MEMBER_REPOSITORY,
  type WorkspaceMemberRepository,
} from '@/modules/workspaces/infrastructure/repositories/workspace-member.repository'
import {
  WORKSPACE_REPOSITORY,
  type WorkspaceRepository,
} from '@/modules/workspaces/infrastructure/repositories/workspace.repository'

const logger = Logger.for('InviteMemberUseCase')

@Service()
export class InviteMemberUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private userRepo: UserRepository,
    @Inject(WORKSPACE_REPOSITORY) private workspaceRepo: WorkspaceRepository,
    @Inject(WORKSPACE_MEMBER_REPOSITORY) private memberRepo: WorkspaceMemberRepository,
    @Inject(JOB_DISPATCHER) private jobs: JobDispatcher,
  ) {}

  async execute(workspaceId: string, dto: InviteMemberDto) {
    const user = await this.userRepo.findByEmail(dto.email)
    if (!user) {
      throw HttpException.notFound(ErrorCode.USER_NOT_FOUND)
    }

    const existing = await this.memberRepo.findByUserAndWorkspace(user._id.toString(), workspaceId)
    if (existing) {
      throw HttpException.conflict(ErrorCode.ALREADY_WORKSPACE_MEMBER)
    }

    const workspace = await this.workspaceRepo.findById(workspaceId)

    const member = await this.memberRepo.create({
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

    return member
  }
}
