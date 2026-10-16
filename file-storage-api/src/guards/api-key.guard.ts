import { createHash, timingSafeEqual } from 'node:crypto'
import { getEnv, HttpException, type MiddlewareHandler } from '@forinda/kickjs'

const digest = (s: string) => createHash('sha256').update(s).digest()

/** `Authorization: Bearer <API_KEY>` or 401. Compared as digests so the check is constant-time. */
export const apiKeyGuard: MiddlewareHandler = (ctx, next) => {
  const key = ctx.headers.authorization?.replace(/^Bearer\s+/i, '') ?? ''
  if (!timingSafeEqual(digest(key), digest(getEnv('API_KEY'))))
    throw HttpException.unauthorized('Invalid API key')
  next()
}
