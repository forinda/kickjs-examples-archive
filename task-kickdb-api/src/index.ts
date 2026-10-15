import 'reflect-metadata'
// Side-effect import — registers the env schema before anything resolves @Value / ConfigService.
import './config'
import { bootstrap, expressRuntime, requestId, requestLogger, helmet, cors } from '@forinda/kickjs'
import { kickDbAdapter } from '@forinda/kickjs-db'
import express from 'express'
import { modules } from './modules'
import { migrationAdapter } from './db/client'
import { DbAdapter } from './db/db.adapter'

export const app = await bootstrap({
  modules,
  runtime: expressRuntime(),
  middlewares: [helmet(), cors({ origin: '*' }), requestId(), requestLogger(), express.json()],
  adapters: [
    DbAdapter(),
    kickDbAdapter({
      migrationAdapter,
      migrationsDir: 'db/migrations',
      // Dev applies pending migrations on boot; anywhere else the app refuses
      // to start until `kick db migrate latest` has run.
      migrationsOnBoot: process.env.NODE_ENV === 'development' ? 'apply' : 'fail-if-pending',
    }),
  ],
})
