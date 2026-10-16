/// <reference types="@forinda/kickjs-vite/globals" />
import 'reflect-metadata'
// Side-effect import — registers the env schema before anything resolves @Value / ConfigService.
import './config'
import {
  bootstrap,
  getEnv,
  expressRuntime,
  requestId,
  requestLogger,
  helmet,
  cors,
  type AppAdapter,
} from '@forinda/kickjs'
import { kickDbAdapter } from '@forinda/kickjs-db'
import express from 'express'
import { modules } from './modules'
import { migrationAdapter } from './db/client'
import { DbAdapter } from './adapters/db.adapter'

const adapters: AppAdapter[] = [
  DbAdapter(),
  kickDbAdapter({
    migrationAdapter,
    migrationsDir: 'db/migrations',
    // Dev applies pending migrations on boot; anywhere else the app refuses
    // to start until `kick db migrate latest` has run.
    migrationsOnBoot:
      process.env.NODE_ENV === 'development' || getEnv('MIGRATE_ON_BOOT')
        ? 'apply'
        : 'fail-if-pending',
  }),
]

// DevTools (/_debug) in `kick dev` only: the build sets __KICKJS_DEVTOOLS__ to false and
// drops this branch, so the package is not in the production bundle.
if (__KICKJS_DEVTOOLS__) {
  const { DevToolsAdapter } = await import('@forinda/kickjs-devtools')
  adapters.push(DevToolsAdapter())
}

export const app = await bootstrap({
  modules,
  runtime: expressRuntime(),
  middlewares: [helmet(), cors({ origin: '*' }), requestId(), requestLogger(), express.json()],
  adapters,
})
