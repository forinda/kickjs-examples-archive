import 'reflect-metadata'
import { env } from './config'
import express from 'express'
import { bootstrap, expressRuntime } from '@forinda/kickjs'
import { AuthAdapter, jwtStrategy } from './auth'
import { modules } from './modules'
import { LoadTenant } from './contributors/tenant.context'
import { TenantDbPlugin } from './plugins/tenant-db.plugin'

/**
 * Multi-tenant Mongoose example (BYO recipe — no `@forinda/kickjs-multi-tenant`).
 *
 * Flow:
 *   1. `LoadTenant` (Context Contributor) resolves tenant from subdomain
 *      and writes it to `ctx.get('tenant')` for every request.
 *   2. `TenantDbPlugin` registers `TENANT_DB` as a REQUEST-scoped factory
 *      that returns the typed DB for the active tenant.
 *   3. AuthAdapter (BYO, src/auth) authenticates the request (JWT).
 *   4. Controller uses TenantDbService (or `@Inject(TENANT_DB)`) to access
 *      the typed DB for the current tenant.
 *
 * Recipes: https://kickjs.app/guide/multi-tenancy and
 * https://kickjs.app/guide/byo-recipes#auth
 */
export const app = await bootstrap({
  modules,
  runtime: expressRuntime(),
  middlewares: [express.json()],
  contributors: [LoadTenant.registration],
  plugins: [TenantDbPlugin()],
  adapters: [
    AuthAdapter({
      strategies: [
        jwtStrategy({
          secret: env.JWT_SECRET,
          mapPayload: (p) => ({ id: p.sub!, email: p.email, roles: p.roles ?? ['user'] }),
        }),
      ],
      defaultPolicy: 'open', // Open for demo — use 'protected' in production
    }),
  ],
})
