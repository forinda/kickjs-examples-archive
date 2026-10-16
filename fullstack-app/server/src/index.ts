/// <reference types="@forinda/kickjs-vite/globals" />
import 'reflect-metadata'
// Side-effect import — registers the env schema before bootstrap().
import './config'
import { bootstrap, getEnv, expressRuntime, type AppAdapter } from '@forinda/kickjs'
import { SpaAdapter } from '@forinda/kickjs/spa'
import { kickDbAdapter } from '@forinda/kickjs-db'
import express from 'express'
import { DbAdapter } from './adapters/db.adapter'
import { isDevOrTest } from './config/dev-default'
import { validationError } from './config/validation-error'
import { migrationAdapter } from './db/client'
import { modules } from './modules'

const adapters: AppAdapter[] = [
  DbAdapter(),
  kickDbAdapter({
    migrationAdapter,
    migrationsDir: 'db/migrations',
    // Fails closed: production and an unset NODE_ENV refuse to boot with pending migrations.
    migrationsOnBoot: isDevOrTest() || getEnv('MIGRATE_ON_BOOT') ? 'apply' : 'fail-if-pending',
  }),
  // Serves the built frontend from this origin in production. Inert until
  // web/dist exists, so `kick dev` (Vite serves the client) is unaffected.
  SpaAdapter({ clientDir: '../web/dist' }),
]

// DevTools (/_debug) in `kick dev` only: the build sets __KICKJS_DEVTOOLS__ to false and
// drops this branch, so the package is not in the production bundle.
if (__KICKJS_DEVTOOLS__) {
  const { DevToolsAdapter } = await import('@forinda/kickjs-devtools')
  adapters.push(DevToolsAdapter())
}

// Export the app for the Vite plugin (dev mode)
export const app = await bootstrap({
  modules,
  runtime: expressRuntime(),
  // Express needs a body parser; Fastify and h3 parse bodies natively.
  middlewares: [express.json()],
  validationError,
  adapters,
})
