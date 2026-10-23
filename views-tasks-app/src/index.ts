import 'reflect-metadata'
// Side-effect import — registers and validates the env schema before
// bootstrap(). SESSION_SECRET is required unless NODE_ENV is development or test.
import './config'
import {
  bootstrap,
  csrf,
  expressRuntime,
  formErrorHandler,
  getEnv,
  requestId,
  session,
} from '@forinda/kickjs'
import { kickDbAdapter } from '@forinda/kickjs-db'
import { KickView } from '@forinda/kickjs-view'
import express from 'express'
import { DbAdapter } from './adapters/db.adapter'
import { isDevOrTest } from './config/dev-default'
import { migrationAdapter } from './db/client'
import { modules } from './modules'
import { views } from './views'

// Export the app for the Vite plugin (dev mode)
export const app = await bootstrap({
  modules,
  runtime: expressRuntime(),
  middlewares: [
    requestId(),
    // Express needs body parsers; Fastify and h3 parse bodies natively.
    // Forms post urlencoded bodies.
    express.urlencoded({ extended: false }),
    express.json(),
    // The signed-in user id, flash messages and form errors, in an encrypted cookie.
    session({ secret: getEnv('SESSION_SECRET'), store: 'cookie' }),
    // Every form posts the token (`_csrf`, from csrfToken(ctx) in src/views.ts),
    // and the request must come from this site. After the body parsers: it reads the field.
    csrf(),
  ],
  adapters: [
    DbAdapter(),
    kickDbAdapter({
      migrationAdapter,
      migrationsDir: 'db/migrations',
      // Auto-apply only in development/test; anywhere else (incl. unset NODE_ENV) pending migrations stop the boot.
      migrationsOnBoot: isDevOrTest() || getEnv('MIGRATE_ON_BOOT') ? 'apply' : 'fail-if-pending',
    }),
    KickView({ views }),
  ],
  // A form that fails validation goes back to its page with the errors and what was typed.
  onError: formErrorHandler(),
})
