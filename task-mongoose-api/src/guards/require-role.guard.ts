import { defineHttpContextDecorator, HttpException } from '@forinda/kickjs'

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
