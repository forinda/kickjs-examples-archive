import { Service, Inject } from '@forinda/kickjs'
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@/modules/users/infrastructure/repositories/user.repository'
import {
  WORKSPACE_MEMBER_REPOSITORY,
  type WorkspaceMemberRepository,
} from '@/modules/workspaces/infrastructure/repositories/workspace-member.repository'

@Service()
export class ListMembersUseCase {
  constructor(
    @Inject(WORKSPACE_MEMBER_REPOSITORY) private memberRepo: WorkspaceMemberRepository,
    @Inject(USER_REPOSITORY) private userRepo: UserRepository,
  ) {}

  async execute(workspaceId: string) {
    const members = await this.memberRepo.findByWorkspace(workspaceId)
    const enriched = await Promise.all(
      members.map(async (m) => {
        const user = await this.userRepo.findById(m.userId.toString())
        return {
          id: m._id.toString(),
          userId: m.userId.toString(),
          role: m.role,
          joinedAt: m.joinedAt,
          user: user
            ? {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                avatarUrl: user.avatarUrl,
              }
            : null,
        }
      }),
    )
    return enriched
  }
}
