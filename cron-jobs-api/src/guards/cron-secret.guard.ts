import { timingSafeEqual } from 'node:crypto'
import type { RequestContext } from '@forinda/kickjs'
import { env } from '@/config'

/**
 * Requires `Authorization: Bearer $CRON_SECRET` — the same check the
 * framework's serverless trigger (`/_kick/cron/:scheduleId`) makes. With no
 * CRON_SECRET set the route is closed.
 */
export function cronSecretGuard(ctx: RequestContext, next: () => void): void {
  const secret = env.CRON_SECRET
  const given = Buffer.from(ctx.headers.authorization ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    ctx.problem.unauthorized({ detail: 'Missing or invalid CRON_SECRET bearer token' })
    return
  }
  next()
}
