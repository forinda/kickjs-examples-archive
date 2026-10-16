import {
  type RequestContext,
  type MiddlewareHandler,
  Container,
  HttpException,
} from '@forinda/kickjs'
import { ErrorCode } from '@/shared/error-codes'
import { getUser } from '@/auth'
import { CHANNEL_REPOSITORY } from '@/modules/channels/channel.repository'
import type { ChannelEntity } from '@/modules/channels/channel.schema'
import { findWorkspaceMember } from '@/guards/workspace-membership.guard'

/** What this guard puts on the request context. */
declare module '@forinda/kickjs' {
  interface ContextMeta {
    channel: ChannelEntity
  }
}

/**
 * The channel (and the user's workspace membership) when the user can see it:
 * a member of its workspace, and for a private or direct channel one of its
 * members. Null otherwise — callers answer that exactly like a missing channel.
 */
export async function findChannelForMember(userId: string, channelId: string) {
  const channel = await Container.getInstance().resolve(CHANNEL_REPOSITORY).findById(channelId)
  if (!channel) return null
  const member = await findWorkspaceMember(userId, channel.workspaceId.toString())
  if (!member) return null
  if (channel.type !== 'public' && !channel.memberIds.some((id) => id.toString() === userId)) {
    return null
  }
  return { channel, member }
}

/** Routes with `:channelId`: non-members get the same 404 as a missing channel. */
export const channelMembershipGuard: MiddlewareHandler = async (ctx: RequestContext, next) => {
  const access = await findChannelForMember(getUser(ctx).id, ctx.params.channelId)
  if (!access) throw HttpException.notFound(ErrorCode.CHANNEL_NOT_FOUND)
  ctx.set('channel', access.channel)
  ctx.set('workspaceMember', access.member)
  next()
}
