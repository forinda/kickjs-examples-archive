import { Service, Inject, HttpException } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/constants/error-codes'
import {
  WORKSPACE_MEMBER_REPOSITORY,
  type WorkspaceMember,
  type WorkspaceMemberRepository,
} from '@/modules/workspaces/workspace-member.repository'
import {
  WORKSPACE_REPOSITORY,
  type Workspace,
  type WorkspaceRepository,
} from '@/modules/workspaces/workspace.repository'

@Service()
export class WorkspaceDomainService {
  constructor(
    @Inject(WORKSPACE_REPOSITORY)
    private readonly repo: WorkspaceRepository,
    @Inject(WORKSPACE_MEMBER_REPOSITORY)
    private readonly memberRepo: WorkspaceMemberRepository,
  ) {}

  async ensureExists(id: string): Promise<Workspace> {
    const workspace = await this.repo.findById(id)
    if (!workspace) {
      throw HttpException.notFound(ErrorCode.WORKSPACE_NOT_FOUND)
    }
    return workspace
  }

  async ensureMembership(workspaceId: string, userId: string): Promise<WorkspaceMember> {
    const member = await this.memberRepo.findByWorkspaceAndUser(workspaceId, userId)
    if (!member) {
      throw HttpException.forbidden(ErrorCode.NOT_WORKSPACE_MEMBER)
    }
    return member
  }

  async ensureAdmin(workspaceId: string, userId: string): Promise<WorkspaceMember> {
    const member = await this.ensureMembership(workspaceId, userId)
    if (member.role !== 'admin') {
      throw HttpException.forbidden(ErrorCode.FORBIDDEN)
    }
    return member
  }
}
