import { Controller, Get, HttpException, Inject, Post, reply, type Ctx } from '@forinda/kickjs'
import { z } from 'zod'
import { issueToken, verifyToken } from '@/auth'
import { PRESENCE_REPOSITORY, type PresenceRepository } from './presence.repository'
import { roomName } from './chat.gateway'

export const tokenBody = z.object({
  name: z
    .string()
    .trim()
    .regex(/^[\w-]{1,24}$/),
})
export const roomParams = z.object({ room: roomName })

@Controller()
export class ChatController {
  @Inject(PRESENCE_REPOSITORY) private readonly presence!: PresenceRepository

  /** Demo sign-in: hands out a signed chat token for a display name. Swap for your real auth. */
  @Post('/token', { body: tokenBody })
  token(ctx: Ctx<KickRoutes.ChatController['token']>) {
    return reply.created({ token: issueToken(ctx.body.name) })
  }

  /** Same token as the socket: an anonymous caller could otherwise watch any room unseen. */
  @Get('/rooms/:room/users', { params: roomParams })
  async users(ctx: Ctx<KickRoutes.ChatController['users']>) {
    const token = ctx.headers.authorization?.replace(/^Bearer\s+/i, '')
    if (!token || !verifyToken(token))
      throw HttpException.unauthorized('Bearer chat token required')
    return { room: ctx.params.room, users: await this.presence.users(ctx.params.room) }
  }
}
