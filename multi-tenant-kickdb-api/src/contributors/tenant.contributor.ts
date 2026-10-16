import { defineHttpContextDecorator, HttpException } from '@forinda/kickjs'
import { APP_DB } from '@/adapters/db.adapter'

export interface Tenant {
  id: string
  name: string
}

declare module '@forinda/kickjs' {
  interface ContextMeta {
    /** Read by kick/db's tenancy as the current tenant for every query. */
    tenant: Tenant
  }
}

/**
 * Resolves the tenant from the `x-tenant` header or the leading host label
 * (`acme` in `acme.localhost`) against the `tenants` registry.
 *
 * The header and the host are chosen by the caller, so they only say which
 * tenant is asked for. The signed-in user must belong to it (the token's
 * `tenants` claim), or any user could read every tenant's data. A tenant the
 * user is not a member of answers the same 404 as one that does not exist,
 * so the endpoint can't be used to probe which tenant names are registered.
 * Runs after `@LoadAuthUser`, which must be on the same route.
 */
export const LoadTenant = defineHttpContextDecorator({
  key: 'tenant',
  deps: { db: APP_DB },
  dependsOn: ['user'],
  resolve: async (ctx, { db }): Promise<Tenant> => {
    const user = ctx.get('user')
    if (!user) throw HttpException.unauthorized()
    const header = ctx.headers['x-tenant']
    const slug = typeof header === 'string' ? header : (ctx.req.hostname.split('.')[0] ?? '')
    const tenant = user.tenants.includes(slug)
      ? await db
          .selectFrom('tenants')
          .select(['id', 'name'])
          .where('subdomain', '=', slug)
          .executeTakeFirst()
      : undefined
    if (!tenant) throw HttpException.notFound('Unknown tenant')
    return tenant
  },
})
