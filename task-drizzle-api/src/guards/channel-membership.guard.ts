import { Container, HttpException, type MiddlewareHandler } from '@forinda/kickjs'
import type { RequestContext } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/error-codes'
import { getUser } from '@/shared/auth'
import { CHANNEL_REPOSITORY, type Channel } from '@/modules/channels/channel.repository'
import { CHANNEL_MEMBER_REPOSITORY } from '@/modules/channels/channel-member.repository'
import {
  WORKSPACE_MEMBER_REPOSITORY,
  type WorkspaceMember,
} from '@/modules/workspaces/workspace-member.repository'

export interface ChannelAccess {
  channel: Channel
  /** The caller's membership of the channel's workspace. */
  member: WorkspaceMember
}

/**
 * Who can see a channel: a public channel, any member of its workspace; a
 * private (or direct) channel, its own members only. `null` when the channel
 * is missing or hidden from `userId`. Shared by HTTP and `/ws/chat`.
 */
export async function findChannelAccess(
  userId: string,
  channelId: string | null | undefined,
): Promise<ChannelAccess | null> {
  const container = Container.getInstance()
  const channel = channelId ? await container.resolve(CHANNEL_REPOSITORY).findById(channelId) : null
  if (!channel) return null
  const member = await container
    .resolve(WORKSPACE_MEMBER_REPOSITORY)
    .findByWorkspaceAndUser(channel.workspaceId, userId)
  if (!member) return null
  if (
    channel.type !== 'public' &&
    !(await container.resolve(CHANNEL_MEMBER_REPOSITORY).findByChannelAndUser(channel.id, userId))
  ) {
    return null
  }
  return { channel, member }
}

/** Read access (see `findChannelAccess`); anyone else gets the same 404 as a missing record. */
export async function requireChannelAccess(
  ctx: RequestContext,
  channelId: string | null | undefined,
  notFound = 'Channel not found',
): Promise<ChannelAccess> {
  const access = await findChannelAccess(getUser(ctx).id, channelId)
  if (!access) throw HttpException.notFound(notFound)
  return access
}

/** Rename, delete or remove other members: the channel's creator or a workspace admin (403). */
export async function requireChannelManager(
  ctx: RequestContext,
  channelId: string,
): Promise<ChannelAccess> {
  const access = await requireChannelAccess(ctx, channelId)
  if (access.member.role !== 'admin' && access.channel.createdById !== getUser(ctx).id) {
    throw HttpException.forbidden(ErrorCode.FORBIDDEN)
  }
  return access
}

/** Route guard: `ctx.params[param]` names a channel the caller can see. */
export const channelAccess =
  (param = 'id'): MiddlewareHandler =>
  async (ctx: RequestContext, next) => {
    await requireChannelAccess(ctx, ctx.params[param])
    next()
  }

/** Route guard: `ctx.params[param]` names a channel the caller manages. */
export const channelManager =
  (param = 'id'): MiddlewareHandler =>
  async (ctx: RequestContext, next) => {
    await requireChannelManager(ctx, ctx.params[param])
    next()
  }
