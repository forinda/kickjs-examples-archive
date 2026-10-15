import { defineHttpContextDecorator, HealthController, HttpException } from '@forinda/kickjs'
import { AUTH_STRATEGIES } from '@/auth'

/**
 * Resolves `ctx.get('user')`. `on401: 'reject'` (default) answers 401 when no
 * strategy matches; `'allow'` passes through with `user: null`.
 *
 * `beforeValidation` runs it ahead of body validation and `@Middleware()`
 * guards, so an anonymous request gets 401 (not a 422 describing the schema)
 * and the membership guards in `src/guards` can read `ctx.get('user')`.
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
