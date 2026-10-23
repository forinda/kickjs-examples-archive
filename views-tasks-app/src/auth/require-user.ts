import type { RequestContext } from '@forinda/kickjs'
import { db } from '@/db/client'
import type { CurrentUser } from './types'

/** Signed-in pages: loads the user into `ctx.get('user')`, else sends the visitor to /login. */
export async function requireUser(ctx: RequestContext, next: () => void): Promise<void> {
  const id = ctx.session.data.userId
  const user = id
    ? await db.selectFrom('users').select(['id', 'email']).where('id', '=', id).executeTakeFirst()
    : undefined
  if (!user) {
    ctx.redirect('/login')
    return
  }
  ctx.set('user', user)
  next()
}

/** The signed-in user, on a route behind `requireUser`. */
export function currentUser(ctx: RequestContext): CurrentUser {
  const user = ctx.get('user')
  if (!user) throw new Error('currentUser() on a route without requireUser')
  return user
}
