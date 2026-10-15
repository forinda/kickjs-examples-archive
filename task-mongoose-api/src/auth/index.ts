/**
 * BYO auth — replaces the removed `@forinda/kickjs-auth` package.
 * Composed from framework primitives (context decorators, route flags,
 * `defineAdapter`) following the BYO Auth recipe:
 * https://kickjs.app/guide/byo-recipes#auth
 */
import jwt from 'jsonwebtoken'
import {
  createToken,
  defineAdapter,
  defineHttpContextDecorator,
  defineRouteFlag,
  HealthController,
  HttpException,
  type RequestContext,
} from '@forinda/kickjs'

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

/**
 * Resolves `ctx.get('user')`. `on401: 'reject'` (default) answers 401 when no
 * strategy matches; `'allow'` passes through with `user: null`.
 *
 * `beforeValidation` runs it ahead of body validation and `@Middleware()`
 * guards, so an anonymous request gets 401 (not a 422 describing the schema)
 * and the membership guards in `src/shared/guards` can read `ctx.get('user')`.
 */
export const LoadAuthUser = defineHttpContextDecorator.withParams<{
  on401: 'allow' | 'reject'
}>()({
  key: 'user',
  deps: { strategies: AUTH_STRATEGIES },
  // `@Public` routes, plus the built-in /health probes (a framework module we
  // can't decorate) — orchestrators call them without credentials.
  skipWhen: ({ flags, route }) =>
    flags.has('auth.public') || route?.controller === HealthController,
  beforeValidation: true,
  paramDefaults: { on401: 'reject' },
  resolve: async (ctx, { strategies }, params) => {
    for (const strategy of strategies) {
      const user = await strategy.validate(ctx)
      if (user) return user
    }
    if (params.on401 === 'allow') return null
    throw HttpException.unauthorized()
  },
})

/** `@RequireRole({ roles: ['superadmin'] })` — 401 without a user, 403 without a matching `globalRole`. */
export const RequireRole = defineHttpContextDecorator.withParams<{ roles: readonly string[] }>()({
  key: 'roleCheck',
  dependsOn: ['user'],
  paramDefaults: { roles: [] },
  resolve: (ctx, _deps, params) => {
    const user = ctx.get('user')
    if (!user) throw HttpException.unauthorized()
    if (!params.roles.includes(user.globalRole)) throw HttpException.forbidden()
    return true
  },
})

declare module '@forinda/kickjs' {
  interface ContextMeta {
    roleCheck: boolean
  }
}

export const AuthAdapter = defineAdapter<{
  strategies: readonly AuthStrategy[]
  /** `'protected'`: every route needs a user unless `@Public`. `'open'`: opt in per route with `@LoadAuthUser()`. */
  defaultPolicy: 'protected' | 'open'
}>({
  name: 'AuthAdapter',
  build: (opts) => ({
    beforeStart: ({ container }) => {
      container.registerInstance(AUTH_STRATEGIES, opts.strategies)
    },
    contributors: () => [
      LoadAuthUser.with({ on401: opts.defaultPolicy === 'protected' ? 'reject' : 'allow' })
        .registration,
    ],
  }),
})
