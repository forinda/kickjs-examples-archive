import { createHmac, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
// Side effect: registers the env schema (CHAT_SECRET) — tests import this file without src/index.ts.
import '@/config'
import { getEnv } from '@forinda/kickjs'

export type ChatUser = {
  id: string
  name: string
}

const TOKEN_TTL_SECONDS = 60 * 60

const sign = (payload: string) =>
  createHmac('sha256', getEnv('CHAT_SECRET')).update(payload).digest('base64url')

/** `<base64url(json {name, exp})>.<hmac>` — a tiny signed token, no JWT dependency. */
export function issueToken(name: string, ttlSeconds = TOKEN_TTL_SECONDS): string {
  const payload = Buffer.from(
    JSON.stringify({ name, exp: Math.floor(Date.now() / 1000) + ttlSeconds }),
  ).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function verifyToken(token: string): ChatUser | null {
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = Buffer.from(sign(payload))
  const given = Buffer.from(sig)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    const { name, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (typeof name !== 'string' || typeof exp !== 'number' || exp < Date.now() / 1000) return null
    return { id: name, name }
  } catch {
    return null
  }
}

/**
 * `WsAdapter({ auth: { resolveUser } })` hook: reads the token from the upgrade
 * request — `?token=` (browsers can't set headers on a WebSocket) or
 * `Authorization: Bearer`. `null` closes the socket with 4401.
 */
export function resolveSocketUser(request: IncomingMessage): ChatUser | null {
  const query = new URL(request.url ?? '/', 'http://localhost').searchParams.get('token')
  const bearer = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  const token = query ?? bearer
  return token ? verifyToken(token) : null
}
