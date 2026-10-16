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

/** `userId`'s membership of `workspaceId`, or null. */
export async function findWorkspaceMember(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceMemberEntity | null> {
  const memberRepo = Container.getInstance().resolve<WorkspaceMemberRepository>(
    WORKSPACE_MEMBER_REPOSITORY,
  )
  return memberRepo.findByUserAndWorkspace(userId, workspaceId)
}

export async function isWorkspaceMember(userId: string, workspaceId: string): Promise<boolean> {
  return !!(await findWorkspaceMember(userId, workspaceId))
}

/**
 * A user being added to something in `workspaceId` (channel, task assignee,
 * project lead) must already belong to that workspace. Anyone else gets 404
 * USER_NOT_FOUND — the same answer as an unknown id, so other workspaces'
 * users can't be probed or pulled in.
 */
export async function requireTargetMember(workspaceId: string, userId: string): Promise<void> {
  if (!(await isWorkspaceMember(userId, workspaceId))) {
    throw HttpException.notFound(ErrorCode.USER_NOT_FOUND)
  }
}

/** 403 unless `userId` is `ownerId` or `member` is a workspace admin. */
export function requireOwnerOrAdmin(
  member: { role: string },
  ownerId: { toString(): string } | null | undefined,
  userId: string,
  code: string = ErrorCode.FORBIDDEN,
): void {
  if (member.role !== 'admin' && ownerId?.toString() !== userId) {
    throw HttpException.forbidden(code)
  }
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
