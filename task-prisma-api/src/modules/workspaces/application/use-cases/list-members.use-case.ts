import { Service, Inject } from '@forinda/kickjs'
import {
  WORKSPACE_MEMBER_REPOSITORY,
  type WorkspaceMemberRepository,
} from '@/modules/workspaces/workspace-member.repository'

@Service()
export class ListMembersUseCase {
  constructor(
    @Inject(WORKSPACE_MEMBER_REPOSITORY)
    private readonly memberRepo: WorkspaceMemberRepository,
  ) {}

  async execute(workspaceId: string) {
    return this.memberRepo.listByWorkspace(workspaceId)
  }
}
