import 'reflect-metadata'
// Side-effect import — registers the env schema before bootstrap().
import './config'
import { bootstrap, expressRuntime, getEnv } from '@forinda/kickjs'
import { SpaAdapter } from '@forinda/kickjs/spa'
import { kickDbAdapter } from '@forinda/kickjs-db'
import express from 'express'
import { DbAdapter } from './adapters/db.adapter'
import { validationError } from './config/validation-error'
import { migrationAdapter } from './db/client'
import { modules } from './modules'

// Export the app for the Vite plugin (dev mode)
export const app = await bootstrap({
  modules,
  runtime: expressRuntime(),
  // Express needs a body parser; Fastify and h3 parse bodies natively.
  middlewares: [express.json()],
  validationError,
  adapters: [
    DbAdapter(),
    kickDbAdapter({
      migrationAdapter,
      migrationsDir: 'db/migrations',
      migrationsOnBoot: getEnv('NODE_ENV') === 'production' ? 'fail-if-pending' : 'apply',
    }),
    // Serves the built frontend from this origin in production. Inert until
    // web/dist exists, so `kick dev` (Vite serves the client) is unaffected.
    SpaAdapter({ clientDir: '../web/dist' }),
  ],
})
