import type { RequestContext } from '@forinda/kickjs'
import { HttpException } from '@forinda/kickjs'
import type { ChannelMember, Project, WorkspaceMember } from '@/generated/prisma/client'

export interface AuthUser {
  id: string
  email: string
  globalRole: string
}

declare module '@forinda/kickjs' {
  interface ContextMeta {
    /** Set by `authBridgeMiddleware` on authenticated routes. */
    user: AuthUser
    /** Set by the access guards in src/shared/guards. */
    project: Project
    workspaceMember: WorkspaceMember
    channelMember: ChannelMember
  }
}

export function getUser(ctx: RequestContext): AuthUser {
  const user = ctx.get('user')
  if (!user) {
    throw HttpException.unauthorized('Authentication required')
  }

  return user
}
