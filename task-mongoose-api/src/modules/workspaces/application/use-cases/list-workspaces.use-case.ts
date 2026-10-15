import { Service, Inject } from '@forinda/kickjs'
import {
  WORKSPACE_MEMBER_REPOSITORY,
  type WorkspaceMemberRepository,
} from '@/modules/workspaces/infrastructure/repositories/workspace-member.repository'
import {
  WORKSPACE_REPOSITORY,
  type WorkspaceRepository,
} from '@/modules/workspaces/infrastructure/repositories/workspace.repository'

@Service()
export class ListWorkspacesUseCase {
  constructor(
    @Inject(WORKSPACE_REPOSITORY) private workspaceRepo: WorkspaceRepository,
    @Inject(WORKSPACE_MEMBER_REPOSITORY) private memberRepo: WorkspaceMemberRepository,
  ) {}

  async execute(userId: string) {
    const memberships = await this.memberRepo.findByUser(userId)
    const workspaces = await Promise.all(
      memberships.map(async (m) => {
        const ws = await this.workspaceRepo.findById(m.workspaceId.toString())
        return ws ? { ...ws, role: m.role } : null
      }),
    )
    return workspaces.filter(Boolean)
  }
}
