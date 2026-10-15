import type { RequestContext } from '@forinda/kickjs'
import { HttpException } from '@forinda/kickjs'
import type { IProjectRepository } from '@/modules/projects/domain/repositories/project.repository'
import type { IWorkspaceMemberRepository } from '@/modules/workspaces/domain/repositories/workspace-member.repository'
import type { IChannelMemberRepository } from '@/modules/channels/domain/repositories/channel.repository'

export interface AuthUser {
  id: string
  email: string
  globalRole: string
}

type Found<T> = NonNullable<Awaited<T>>

// Values the auth middleware and the membership guards put on ctx.
declare module '@forinda/kickjs' {
  interface ContextMeta {
    user: AuthUser
    project: Found<ReturnType<IProjectRepository['findById']>>
    workspaceMember: Found<ReturnType<IWorkspaceMemberRepository['findByWorkspaceAndUser']>>
    channelMember: Found<ReturnType<IChannelMemberRepository['findByChannelAndUser']>>
  }
}

export function getUser(ctx: RequestContext): AuthUser {
  const user = ctx.get('user')
  if (!user) {
    throw HttpException.unauthorized('Authentication required')
  }

  return user
}
