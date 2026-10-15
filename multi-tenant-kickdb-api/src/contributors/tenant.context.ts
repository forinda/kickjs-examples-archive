import { defineHttpContextDecorator, HttpException } from '@forinda/kickjs'
import { APP_DB } from '../db/db.adapter'

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
 */
export const LoadTenant = defineHttpContextDecorator({
  key: 'tenant',
  deps: { db: APP_DB },
  resolve: async (ctx, { db }): Promise<Tenant> => {
    const header = ctx.headers['x-tenant']
    const slug = typeof header === 'string' ? header : (ctx.req.hostname.split('.')[0] ?? '')
    const tenant = await db
      .selectFrom('tenants')
      .select(['id', 'name'])
      .where('subdomain', '=', slug)
      .executeTakeFirst()
    if (!tenant) throw HttpException.notFound(`Unknown tenant: ${slug}`)
    return tenant
  },
})
