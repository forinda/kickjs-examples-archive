import 'reflect-metadata'
// Side-effect import — registers the env schema before bootstrap().
import './config'
import express from 'express'
import { bootstrap, expressRuntime, getEnv } from '@forinda/kickjs'
import { kickDbAdapter } from '@forinda/kickjs-db'
import { jwtStrategy } from './auth'
import { AuthAdapter } from './adapters/auth.adapter'
import { migrationAdapter } from './db/client'
import { DbAdapter } from './adapters/db.adapter'
import { isDevOrTest } from './config/dev-default'
import { modules } from './modules'

/**
 * Multi-tenant API on kick/db + SQLite.
 *
 *   1. `LoadTenant` (context decorator on tenant-scoped controllers) resolves the
 *      tenant from `x-tenant` or the subdomain into `ctx.get('tenant')`.
 *   2. kick/db's 'column' tenancy (src/db/tenancy.ts) reads that value and scopes
 *      every query on a tenanted table — repositories carry no tenant code.
 *   3. AuthAdapter (BYO, src/adapters/auth.adapter.ts) authenticates with a JWT whose `tenants`
 *      claim lists the tenants the user belongs to; `LoadTenant` refuses any other.
 *
 * Guides: https://kickjs.app/guide/multi-tenancy · https://kickjs.app/guide/database/tenancy
 */
export const app = await bootstrap({
  modules,
  runtime: expressRuntime(),
  middlewares: [express.json()],
  adapters: [
    DbAdapter(),
    kickDbAdapter({
      migrationAdapter,
      migrationsDir: 'db/migrations',
      // Auto-apply only in development/test; anywhere else (incl. unset NODE_ENV) pending migrations stop the boot.
      migrationsOnBoot: isDevOrTest() ? 'apply' : 'fail-if-pending',
    }),
    AuthAdapter({
      strategies: [
        jwtStrategy({
          secret: getEnv('JWT_SECRET'),
          mapPayload: (p) => ({
            id: p.sub!,
            email: p.email,
            roles: p.roles ?? ['user'],
            tenants: Array.isArray(p.tenants) ? p.tenants : [],
          }),
        }),
      ],
      defaultPolicy: 'open', // routes opt in with @LoadAuthUser; use 'protected' for deny-by-default
    }),
  ],
})
