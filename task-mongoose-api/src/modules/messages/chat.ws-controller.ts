import { getEnv, Inject, Logger } from '@forinda/kickjs'
import {
  WsController,
  OnConnect,
  OnDisconnect,
  OnMessage,
  type WsContext,
} from '@forinda/kickjs-ws'
import jwt from 'jsonwebtoken'
import { MESSAGE_REPOSITORY, type MessageRepository } from './message.repository'
import { findChannelForMember } from '@/guards/channel-membership.guard'

const logger = Logger.for('ChatWsController')

// In-memory online users map
const onlineUsers = new Map<string, { userId: string; userName: string }>()

@WsController('/chat')
export class ChatWsController {
  @Inject(MESSAGE_REPOSITORY) private messageRepo!: MessageRepository

  /** Authenticated and allowed in the channel? Otherwise reply as if it didn't exist. */
  private async inChannel(ctx: WsContext, channelId: string): Promise<boolean> {
    const userId = ctx.get('userId')
    const access = userId ? await findChannelForMember(userId, channelId) : null
    if (!access) ctx.send('error', { message: 'Channel not found' })
    return !!access
  }

  /** The message, when the caller sees its channel and wrote it (or is a workspace admin). */
  private async ownMessage(userId: string, messageId: string) {
    const message = await this.messageRepo.findById(messageId)
    const access = message && (await findChannelForMember(userId, message.channelId.toString()))
    if (!message || !access) return null
    return message.senderId.toString() === userId || access.member.role === 'admin' ? message : null
  }

  @OnConnect()
  handleConnect(ctx: WsContext) {
    try {
      const token = ctx.data?.token || ''
      const payload = jwt.verify(token, getEnv('JWT_SECRET')) as any
      const userId = payload.sub
      const email = payload.email

      ctx.set('userId', userId)
      ctx.set('email', email)
      onlineUsers.set(ctx.id, { userId, userName: email })

      ctx.send('welcome', { id: ctx.id, userId })
      ctx.broadcastAll('presence:online', { userId, userName: email })
      logger.info(`User ${email} connected (${ctx.id})`)
    } catch {
      ctx.send('error', { message: 'Invalid authentication token' })
      logger.warn(`Connection rejected: invalid token (${ctx.id})`)
    }
  }

  @OnDisconnect()
  handleDisconnect(ctx: WsContext) {
    const info = onlineUsers.get(ctx.id)
    if (info) {
      ctx.broadcastAll('presence:offline', { userId: info.userId })
      onlineUsers.delete(ctx.id)
      logger.info(`User ${info.userName} disconnected (${ctx.id})`)
    }
  }

  @OnMessage('channel:join')
  async handleJoin(ctx: WsContext) {
    const channelId = ctx.data?.channelId
    if (!channelId || !(await this.inChannel(ctx, channelId))) return
    ctx.join(`channel:${channelId}`)
    ctx.to(`channel:${channelId}`).send('channel:user_joined', {
      channelId,
      userId: ctx.get('userId'),
    })
  }

  @OnMessage('channel:leave')
  handleLeave(ctx: WsContext) {
    const channelId = ctx.data?.channelId
    if (!channelId) return
    ctx.leave(`channel:${channelId}`)
    ctx.to(`channel:${channelId}`).send('channel:user_left', {
      channelId,
      userId: ctx.get('userId'),
    })
  }

  @OnMessage('message:send')
  async handleSend(ctx: WsContext) {
    const userId = ctx.get('userId')
    if (!userId) return ctx.send('error', { message: 'Not authenticated' })

    const { channelId, content } = ctx.data || {}
    if (!channelId || !content || !(await this.inChannel(ctx, channelId))) return

    const message = await this.messageRepo.create({
      channelId: channelId as any,
      senderId: userId as any,
      content,
      mentions: [],
    })

    const info = onlineUsers.get(ctx.id)
    const payload = {
      messageId: message._id.toString(),
      channelId,
      senderId: userId,
      senderName: info?.userName ?? 'Unknown',
      content: message.content,
      createdAt: message.createdAt,
    }

    ctx.to(`channel:${channelId}`).send('message:new', payload)
    ctx.send('message:new', payload)
  }

  @OnMessage('message:edit')
  async handleEdit(ctx: WsContext) {
    const userId = ctx.get('userId')
    if (!userId) return

    const { messageId, content } = ctx.data || {}
    if (!messageId || !content) return

    const message = await this.ownMessage(userId, messageId)
    if (!message) return

    const updated = await this.messageRepo.update(messageId, { content })
    if (!updated) return

    ctx.to(`channel:${message.channelId}`).send('message:edited', {
      messageId,
      channelId: message.channelId.toString(),
      content,
      updatedAt: updated.updatedAt,
    })
  }

  @OnMessage('message:delete')
  async handleDelete(ctx: WsContext) {
    const userId = ctx.get('userId')
    if (!userId) return

    const { messageId } = ctx.data || {}
    if (!messageId) return

    const message = await this.ownMessage(userId, messageId)
    if (!message) return

    await this.messageRepo.softDelete(messageId)
    ctx.to(`channel:${message.channelId}`).send('message:deleted', {
      messageId,
      channelId: message.channelId.toString(),
    })
  }

  @OnMessage('channel:typing')
  async handleTyping(ctx: WsContext) {
    const { channelId } = ctx.data || {}
    if (!channelId || !(await this.inChannel(ctx, channelId))) return
    const info = onlineUsers.get(ctx.id)
    ctx.to(`channel:${channelId}`).send('channel:typing', {
      channelId,
      userId: ctx.get('userId'),
      userName: info?.userName,
    })
  }

  @OnMessage('channel:stop_typing')
  async handleStopTyping(ctx: WsContext) {
    const { channelId } = ctx.data || {}
    if (!channelId || !(await this.inChannel(ctx, channelId))) return
    ctx.to(`channel:${channelId}`).send('channel:stop_typing', {
      channelId,
      userId: ctx.get('userId'),
    })
  }
}

export function getOnlineUsers() {
  return onlineUsers
}
