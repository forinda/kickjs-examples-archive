import {
  type RequestContext,
  type MiddlewareHandler,
  Container,
  HttpException,
} from '@forinda/kickjs'
import { ErrorCode } from '@/shared/error-codes'
import {
  WORKSPACE_MEMBER_REPOSITORY,
  type WorkspaceMemberRepository,
} from '@/modules/workspaces/workspace-member.repository'
import type { WorkspaceMemberEntity } from '@/modules/workspaces/workspace-member.schema'

/** What this guard puts on the request context. */
declare module '@forinda/kickjs' {
  interface ContextMeta {
    workspaceMember: WorkspaceMemberEntity
  }
}

export async function isWorkspaceMember(userId: string, workspaceId: string): Promise<boolean> {
  const memberRepo = Container.getInstance().resolve<WorkspaceMemberRepository>(
    WORKSPACE_MEMBER_REPOSITORY,
  )
  return !!(await memberRepo.findByUserAndWorkspace(userId, workspaceId))
}

export const workspaceMembershipGuard: MiddlewareHandler = async (ctx: RequestContext, next) => {
  const user = ctx.get('user')
  if (!user) {
    throw HttpException.unauthorized('Authentication required')
  }

  const workspaceId = ctx.params.workspaceId
  if (!workspaceId) {
    return next()
  }

  const container = Container.getInstance()
  const memberRepo = container.resolve<WorkspaceMemberRepository>(WORKSPACE_MEMBER_REPOSITORY)
  const member = await memberRepo.findByUserAndWorkspace(user.id, workspaceId)

  // Non-members get the same 404 as a missing workspace — ids can't be probed.
  if (!member) {
    throw HttpException.notFound(ErrorCode.WORKSPACE_NOT_FOUND)
  }

  ctx.set('workspaceMember', member)
  next()
}

export function requireWorkspaceRole(...roles: string[]): MiddlewareHandler {
  return async (ctx: RequestContext, next) => {
    const member = ctx.get('workspaceMember')
    if (!member) {
      throw HttpException.forbidden(ErrorCode.NOT_WORKSPACE_MEMBER)
    }

    if (!roles.includes(member.role)) {
      throw HttpException.forbidden(ErrorCode.FORBIDDEN)
    }

    next()
  }
}
