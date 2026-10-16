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
 * (`acme` in `acme.localhost`) against the `tenants` registry. Unknown → 404.
 *
 * The header and the host are chosen by the caller, so they only say which
 * tenant is asked for. The signed-in user must belong to it (the token's
 * `tenants` claim), or any user could read every tenant's data. Not a
 * member → 403. Runs after `@LoadAuthUser`, which must be on the same route.
 */
export const LoadTenant = defineHttpContextDecorator({
  key: 'tenant',
  deps: { db: APP_DB },
  dependsOn: ['user'],
  resolve: async (ctx, { db }): Promise<Tenant> => {
    const header = ctx.headers['x-tenant']
    const slug = typeof header === 'string' ? header : (ctx.req.hostname.split('.')[0] ?? '')
    const tenant = await db
      .selectFrom('tenants')
      .select(['id', 'name'])
      .where('subdomain', '=', slug)
      .executeTakeFirst()
    if (!tenant) throw HttpException.notFound(`Unknown tenant: ${slug}`)
    const user = ctx.get('user')
    if (!user) throw HttpException.unauthorized()
    if (!user.tenants.includes(slug)) throw HttpException.forbidden(`Not a member of ${slug}`)
    return tenant
  },
})
