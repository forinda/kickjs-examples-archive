import { createHash, timingSafeEqual } from 'node:crypto'
import { HttpException, type MiddlewareHandler } from '@forinda/kickjs'
import { env } from '@/config'

const digest = (s: string) => createHash('sha256').update(s).digest()
const expected = digest(env.API_KEY)

/** `Authorization: Bearer <API_KEY>` or 401. Compared as digests so the check is constant-time. */
export const apiKeyGuard: MiddlewareHandler = (ctx, next) => {
  const key = ctx.headers.authorization?.replace(/^Bearer\s+/i, '') ?? ''
  if (!timingSafeEqual(digest(key), expected)) throw HttpException.unauthorized('Invalid API key')
  next()
}
