import './context'
import {
  type RequestContext,
  type MiddlewareHandler,
  Container,
  HttpException,
} from '@forinda/kickjs'
import { ErrorCode } from '@/shared/error-codes'
import { CHANNEL_REPOSITORY } from '@/modules/channels/channel.repository'

export const channelMembershipGuard: MiddlewareHandler = async (ctx: RequestContext, next) => {
  const user = ctx.get('user')
  if (!user) {
    throw HttpException.unauthorized('Authentication required')
  }

  const channelId = ctx.params.channelId
  if (!channelId) {
    return next()
  }

  const container = Container.getInstance()
  const channelRepo = container.resolve(CHANNEL_REPOSITORY)
  const channel = await channelRepo.findById(channelId)

  if (!channel) {
    throw HttpException.notFound(ErrorCode.CHANNEL_NOT_FOUND)
  }

  if (channel.type === 'private') {
    const isMember = channel.memberIds.some((id) => id.toString() === user.id)
    if (!isMember) {
      throw HttpException.forbidden(ErrorCode.NOT_CHANNEL_MEMBER)
    }
  }

  ctx.set('channel', channel)
  next()
}
