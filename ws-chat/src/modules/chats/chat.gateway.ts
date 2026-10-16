import { Inject } from '@forinda/kickjs'
import {
  OnConnect,
  OnDisconnect,
  OnMessage,
  WsController,
  type WsContext,
} from '@forinda/kickjs-ws'
import { z } from 'zod'
import type { ChatUser } from '@/auth'
import { PRESENCE_REPOSITORY, type PresenceRepository } from './presence.repository'

export const roomName = z.string().regex(/^[a-z0-9-]{1,32}$/)
const roomMessage = z.object({ room: roomName })
const chatMessage = z.object({ room: roomName, text: z.string().trim().min(1).max(500) })

// Prefixed: WsAdapter room names are global, and `user:<id>` rooms already exist.
const channel = (room: string) => `room:${room}`

/**
 * `ws://host/ws/chat?token=…` — the WsAdapter's `auth.resolveUser` has already
 * refused sockets without a valid token (close code 4401) before any of this runs.
 *
 * Client → server: `room:join {room}`, `room:leave {room}`, `message:send {room, text}`.
 * Server → client: `welcome`, `room:users {room, users}`, `message {room, from, text, at}`,
 * `error {message}`.
 */
@WsController('/chat')
export class ChatGateway {
  @Inject(PRESENCE_REPOSITORY) private readonly presence!: PresenceRepository

  @OnConnect()
  connect(ctx: WsContext) {
    ctx.send('welcome', { id: ctx.id, name: this.user(ctx).name })
  }

  @OnMessage('room:join')
  async join(ctx: WsContext) {
    const parsed = roomMessage.safeParse(ctx.data)
    if (!parsed.success) return ctx.send('error', { message: 'room must match [a-z0-9-]{1,32}' })
    const { room } = parsed.data
    ctx.join(channel(room))
    await this.presence.add(room, ctx.id, this.user(ctx).name)
    await this.announce(ctx, room)
  }

  @OnMessage('room:leave')
  async leave(ctx: WsContext) {
    const parsed = roomMessage.safeParse(ctx.data)
    if (!parsed.success || !ctx.rooms().includes(channel(parsed.data.room))) return
    ctx.leave(channel(parsed.data.room))
    await this.presence.remove(parsed.data.room, ctx.id)
    await this.announce(ctx, parsed.data.room)
    ctx.send('room:users', { room: parsed.data.room, users: [] })
  }

  @OnMessage('message:send')
  send(ctx: WsContext) {
    const parsed = chatMessage.safeParse(ctx.data)
    if (!parsed.success)
      return ctx.send('error', { message: 'expected { room, text (1-500 chars) }' })
    const { room, text } = parsed.data
    if (!ctx.rooms().includes(channel(room))) {
      return ctx.send('error', { message: `join ${room} before sending to it` })
    }
    ctx.to(channel(room)).send('message', {
      room,
      from: this.user(ctx).name,
      text,
      at: new Date().toISOString(),
    })
  }

  @OnMessage('*')
  unknown(ctx: WsContext) {
    ctx.send('error', { message: `unknown event: ${ctx.event}` })
  }

  @OnDisconnect()
  async disconnect(ctx: WsContext) {
    // Read synchronously: the adapter drops the socket's rooms right after this handler starts.
    const rooms = ctx.rooms().flatMap((r) => (r.startsWith('room:') ? [r.slice(5)] : []))
    for (const room of rooms) {
      await this.presence.remove(room, ctx.id)
      await this.announce(ctx, room)
    }
  }

  private user(ctx: WsContext) {
    return ctx.get<ChatUser>('user')!
  }

  /** Everyone in the room — on every instance, through the broker — gets the new list. */
  private async announce(ctx: WsContext, room: string) {
    ctx.to(channel(room)).send('room:users', { room, users: await this.presence.users(room) })
  }
}
