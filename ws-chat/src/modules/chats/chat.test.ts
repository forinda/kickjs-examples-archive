import 'reflect-metadata'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { WebSocket } from 'ws'
import { Application, Container } from '@forinda/kickjs'
import { WsAdapter } from '@forinda/kickjs-ws'
import { issueToken, resolveSocketUser } from '@/auth'
import { ChatModule } from './chat.module'

type Frame = { event: string; data: any }

/** A client that buffers frames, so a test can wait for one that already arrived. */
async function connect(base: string, token?: string) {
  const ws = new WebSocket(token ? `${base}?token=${token}` : base)
  const frames: Frame[] = []
  const waiters: Array<() => void> = []
  ws.on('message', (raw) => {
    frames.push(JSON.parse(String(raw)))
    waiters.splice(0).forEach((w) => w())
  })
  await new Promise((resolve, reject) => ws.once('open', resolve).once('error', reject))
  const next = (event: string, match: (d: any) => boolean = () => true, ms = 2000) =>
    new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`no ${event} within ${ms}ms`)), ms)
      const check = () => {
        const i = frames.findIndex((f) => f.event === event && match(f.data))
        if (i === -1) return void waiters.push(check)
        clearTimeout(timer)
        resolve(frames.splice(i, 1)[0].data)
      }
      check()
    })
  const send = (event: string, data: unknown) => ws.send(JSON.stringify({ event, data }))
  return { ws, frames, next, send }
}

describe('ws-chat', () => {
  let app: Application
  let base: string

  beforeAll(async () => {
    Container.reset()
    app = new Application({
      modules: [ChatModule()],
      adapters: [WsAdapter({ heartbeatInterval: 100, auth: { resolveUser: resolveSocketUser } })],
      port: 0,
    })
    await app.start()
    const { port } = app.getHttpServer()!.address() as AddressInfo
    base = `ws://127.0.0.1:${port}/ws/chat`
  })

  afterAll(() => app.shutdown())

  it('refuses a socket without a valid token (close 4401)', async () => {
    for (const token of [undefined, 'forged.token', issueToken('eve', -1)]) {
      const { ws } = await connect(base, token)
      const code = await new Promise<number>((resolve) => ws.once('close', resolve))
      expect(code).toBe(4401)
    }
  })

  it('delivers a room message from one client to another, with the room user list', async () => {
    const alice = await connect(base, issueToken('alice'))
    const bob = await connect(base, issueToken('bob'))
    expect(await alice.next('welcome')).toMatchObject({ name: 'alice' })

    alice.send('room:join', { room: 'general' })
    await alice.next('room:users', (d) => d.users.includes('alice'))
    bob.send('room:join', { room: 'general' })
    expect(await alice.next('room:users', (d) => d.users.length === 2)).toEqual({
      room: 'general',
      users: ['alice', 'bob'],
    })

    alice.send('message:send', { room: 'general', text: 'hi bob' })
    expect(await bob.next('message')).toMatchObject({
      room: 'general',
      from: 'alice',
      text: 'hi bob',
    })

    // Same list over HTTP.
    const http = request(app.handle.bind(app))
    await http.get('/api/v1/chat/rooms/general/users').expect(401)
    const res = await http
      .get('/api/v1/chat/rooms/general/users')
      .set('authorization', `Bearer ${issueToken('carol')}`)
      .expect(200)
    expect(res.body.users).toEqual(['alice', 'bob'])

    // Leaving (or disconnecting) updates everyone else's list.
    bob.ws.close()
    expect(await alice.next('room:users', (d) => d.users.length === 1)).toEqual({
      room: 'general',
      users: ['alice'],
    })
    alice.ws.close()
  })

  it('keeps rooms isolated and refuses sending to a room you have not joined', async () => {
    const a = await connect(base, issueToken('ann'))
    const b = await connect(base, issueToken('ben'))
    a.send('room:join', { room: 'red' })
    b.send('room:join', { room: 'blue' })
    await a.next('room:users')
    await b.next('room:users')

    a.send('message:send', { room: 'red', text: 'red only' })
    expect(await a.next('message')).toMatchObject({ text: 'red only' }) // the sender is in the room too
    a.send('message:send', { room: 'blue', text: 'sneaky' })
    expect(await a.next('error')).toEqual({ message: 'join blue before sending to it' })

    await new Promise((r) => setTimeout(r, 100))
    expect(b.frames.filter((f) => f.event === 'message')).toEqual([])
    a.ws.close()
    b.ws.close()
  })

  it('pings on the heartbeat interval', async () => {
    const c = await connect(base, issueToken('carol'))
    await new Promise((resolve) => c.ws.once('ping', resolve))
    c.ws.close()
  })

  it('issues tokens only for valid names', async () => {
    const http = request(app.handle.bind(app))
    await http.post('/api/v1/chat/token').send({ name: 'x y' }).expect(422)
    const res = await http.post('/api/v1/chat/token').send({ name: 'dana' }).expect(201)
    expect(res.body.token).toMatch(/\./)
  })
})
