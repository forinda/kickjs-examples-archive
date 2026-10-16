import { defineHttpContextDecorator, HttpException } from '@forinda/kickjs'
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
  // `@Public` routes, and the built-in /health probes — src/index.ts puts the
  // same flag on them via `bootstrap({ health: { flags } })`.
  skipWhen: 'auth.public',
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
