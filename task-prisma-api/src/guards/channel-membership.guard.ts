import { Container, HttpException, type MiddlewareHandler } from '@forinda/kickjs'
import type { RequestContext } from '@forinda/kickjs'
import { getUser } from '@/shared/auth'
import { CHANNEL_MEMBER_REPOSITORY } from '@/modules/channels/channel-member.repository'

/** Channel members only; anyone else gets the same 404 as a missing record (`notFound`). */
export async function requireChannelMember(
  ctx: RequestContext,
  channelId: string | null | undefined,
  notFound = 'Channel not found',
): Promise<void> {
  const member = channelId
    ? await Container.getInstance()
        .resolve(CHANNEL_MEMBER_REPOSITORY)
        .findByChannelAndUser(channelId, getUser(ctx).id)
    : null
  if (!member) throw HttpException.notFound(notFound)
}

/** Routes with `:channelId`: channel members only. */
export const channelMembershipGuard: MiddlewareHandler = async (ctx: RequestContext, next) => {
  await requireChannelMember(ctx, ctx.params.channelId)
  next()
}
