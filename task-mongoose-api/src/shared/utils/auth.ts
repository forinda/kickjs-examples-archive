import type { RequestContext } from '@forinda/kickjs'
import { HttpException } from '@forinda/kickjs'
import type { AuthUser } from '@/auth'

export type { AuthUser } from '@/auth'

/** The authenticated user, resolved by `LoadAuthUser` (src/auth). Throws 401 when absent. */
export function getUser(ctx: RequestContext): AuthUser {
  const user = ctx.get('user')
  if (!user) throw HttpException.unauthorized('Authentication required')
  return user
}
