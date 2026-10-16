import { Container, HttpException, type MiddlewareHandler } from '@forinda/kickjs'
import type { RequestContext } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/error-codes'
import { getUser } from '@/shared/auth'
import {
  WORKSPACE_MEMBER_REPOSITORY,
  type WorkspaceMember,
} from '@/modules/workspaces/workspace-member.repository'

/**
 * The caller must be a member of `workspaceId` (with one of `roles`, when
 * given). A non-member gets the same 404 as a missing record — `notFound` —
 * so ids from other workspaces can't be probed; a member without the role
 * gets 403.
 */
export async function requireWorkspaceMember(
  ctx: RequestContext,
  workspaceId: string | null | undefined,
  notFound = 'Workspace not found',
  roles?: string[],
): Promise<WorkspaceMember> {
  const member = workspaceId
    ? await Container.getInstance()
        .resolve(WORKSPACE_MEMBER_REPOSITORY)
        .findByWorkspaceAndUser(workspaceId, getUser(ctx).id)
    : null
  if (!member) throw HttpException.notFound(notFound)
  if (roles && !roles.includes(member.role)) throw HttpException.forbidden(ErrorCode.FORBIDDEN)
  return member
}

/**
 * A user being added to something in `workspaceId` (channel, task assignee,
 * project lead) must already belong to that workspace. Anyone else gets 404
 * "User not found" — the same answer as an unknown id, so other workspaces'
 * users can't be probed or pulled in.
 */
export async function requireTargetMember(
  workspaceId: string | null | undefined,
  userId: string,
): Promise<void> {
  const member = workspaceId
    ? await Container.getInstance()
        .resolve(WORKSPACE_MEMBER_REPOSITORY)
        .findByWorkspaceAndUser(workspaceId, userId)
    : null
  if (!member) throw HttpException.notFound('User not found')
}

/** 403 unless the caller is `ownerId` or a workspace admin. */
export function requireOwnerOrAdmin(
  ctx: RequestContext,
  member: WorkspaceMember,
  ownerId: string | null | undefined,
  code: string = ErrorCode.FORBIDDEN,
): void {
  if (member.role !== 'admin' && ownerId !== getUser(ctx).id) throw HttpException.forbidden(code)
}

/** Routes with `:workspaceId` (or `:id` on /workspaces): members only. */
export const workspaceMembershipGuard: MiddlewareHandler = async (ctx: RequestContext, next) => {
  await requireWorkspaceMember(ctx, ctx.params.workspaceId || ctx.params.id)
  next()
}

/** Members with one of `roles` only — e.g. `requireWorkspaceRole('admin')`. */
export const requireWorkspaceRole =
  (...roles: string[]): MiddlewareHandler =>
  async (ctx: RequestContext, next) => {
    await requireWorkspaceMember(
      ctx,
      ctx.params.workspaceId || ctx.params.id,
      'Workspace not found',
      roles,
    )
    next()
  }
