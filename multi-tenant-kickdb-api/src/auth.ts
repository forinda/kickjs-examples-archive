/**
 * BYO auth — replaces the removed `@forinda/kickjs-auth` package.
 * Composed from framework primitives (context decorators, route flags,
 * `defineAdapter`) following the BYO Auth recipe:
 * https://kickjs.app/guide/byo-recipes#auth
 *
 * This file holds the user type, strategies and the `@Public` flag; the
 * `@LoadAuthUser` contributor is in src/contributors/auth-user.contributor.ts
 * and `AuthAdapter` in src/adapters/auth.adapter.ts.
 */
import jwt from 'jsonwebtoken'
import { createToken, defineRouteFlag, type RequestContext } from '@forinda/kickjs'

export interface AuthUser {
  id: string
  email: string
  roles: readonly string[]
  /** Subdomains of the tenants this user belongs to (the token's `tenants` claim). */
  tenants: readonly string[]
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
