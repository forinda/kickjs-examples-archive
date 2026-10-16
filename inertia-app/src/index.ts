import 'reflect-metadata'
// Side-effect import — registers and validates the env schema before
// bootstrap(). SESSION_SECRET is required unless NODE_ENV is development or test.
import './config'
import { bootstrap, getEnv, requestId, session, expressRuntime } from '@forinda/kickjs'
import { kickDbAdapter } from '@forinda/kickjs-db'
import { InertiaAdapter, inertiaErrorHandler, inertiaNotFound } from '@forinda/kickjs-inertia'
import express from 'express'
import { migrationAdapter } from './db/client'
import { DbAdapter } from './adapters/db.adapter'
import { isDevOrTest } from './config/dev-default'
import { inertiaOptions } from './config/inertia'
import { modules } from './modules'

// Export the app for the Vite plugin (dev mode)
export const app = await bootstrap({
  modules,
  runtime: expressRuntime(),
  middlewares: [
    requestId(),
    // Express needs a body parser; Fastify and h3 parse bodies natively.
    express.json(),
    // Carries validation errors and flash messages to the next page, in an
    // encrypted cookie — nothing shared between instances.
    session({ secret: getEnv('SESSION_SECRET'), store: 'cookie' }),
  ],
  adapters: [
    DbAdapter(),
    kickDbAdapter({
      migrationAdapter,
      migrationsDir: 'db/migrations',
      // Auto-apply only in development/test; anywhere else (incl. unset NODE_ENV) pending migrations stop the boot.
      migrationsOnBoot: isDevOrTest() ? 'apply' : 'fail-if-pending',
    }),
    InertiaAdapter({
      ...inertiaOptions,
      head: '<link rel="icon" href="/favicon.svg" type="image/svg+xml" />',
      ssr: { entry: 'src/client/ssr.tsx' },
    }),
  ],
  // A failed validation on an Inertia visit goes back to the form with
  // `props.errors` instead of answering 422.
  onError: inertiaErrorHandler(),
  // Unknown URLs: the Error page for browsers, the usual 404 / 405 for API calls.
  onNotFound: inertiaNotFound(),
  // Answer unknown URLs here in dev too — not by handing them back to Vite.
  notFoundFallthrough: false,
})
