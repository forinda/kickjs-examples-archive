/**
 * BYO auth — replaces the removed `@forinda/kickjs-auth` package.
 * Composed from framework primitives following the BYO Auth recipe — this file
 * holds the strategy helpers; the pieces live where the generators put them:
 * `src/adapters/auth.adapter.ts`, `src/contributors/load-auth-user.contributor.ts`,
 * `src/guards/require-role.guard.ts`. Recipe:
 * https://kickjs.app/guide/byo-recipes#auth
 */
import jwt from 'jsonwebtoken'
import { createToken, defineRouteFlag, HttpException, type RequestContext } from '@forinda/kickjs'

export interface AuthUser {
  id: string
  email: string
  globalRole: string
}

declare module '@forinda/kickjs' {
  interface ContextMeta {
    user: AuthUser | null
  }
}

/** A strategy turns a request into a user, or `null` if its credential is absent/invalid. */
export interface AuthStrategy {
  name: string
  validate(ctx: RequestContext): Promise<AuthUser | null> | AuthUser | null
}

export function jwtStrategy(opts: {
  secret: string
  mapPayload: (payload: jwt.JwtPayload) => AuthUser
}): AuthStrategy {
  return {
    name: 'jwt',
    validate: (ctx) => {
      const header = ctx.headers.authorization
      if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null
      try {
        return opts.mapPayload(jwt.verify(header.slice(7), opts.secret) as jwt.JwtPayload)
      } catch {
        return null
      }
    },
  }
}

export const AUTH_STRATEGIES = createToken<readonly AuthStrategy[]>('app/Auth/strategies')

/** Marks a route (or every route on a controller) as reachable without a user. */
export const Public = defineRouteFlag('auth.public')

/** The authenticated user, resolved by `LoadAuthUser`. Throws 401 when absent. */
export function getUser(ctx: RequestContext): AuthUser {
  const user = ctx.get('user')
  if (!user) throw HttpException.unauthorized('Authentication required')
  return user
}
