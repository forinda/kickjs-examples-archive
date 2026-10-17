/// <reference types="@forinda/kickjs-vite/globals" />
import 'reflect-metadata'
// Side-effect import — registers the env schema before anything reads it.
import './config'
import express from 'express'
import { bootstrap, expressRuntime, getEnv } from '@forinda/kickjs'
import { modules } from './modules'
import { adapters, managementPort } from './config/adapters'

/*
 * One codebase, three ways to run it (APP_ROLE):
 *   all    — API + workers in one process (default; `pnpm dev`)
 *   api    — dispatches jobs, runs none
 *   worker — runs jobs, no API routes (`pnpm worker`, src/worker.ts)
 */
const role = getEnv('APP_ROLE')

// Importing the @Job classes is what starts their workers.
if (role !== 'api') await import('./modules/jobs/job.processors')

export const app = await bootstrap({
  modules: role === 'worker' ? [] : modules,
  runtime: expressRuntime(),
  port: role === 'worker' ? getEnv('WORKER_PORT') : getEnv('PORT'),
  middlewares: [express.json()],
  // On SIGTERM, QueueAdapter closes its workers, and BullMQ's worker.close()
  // waits for the jobs they're running. This bounds that wait.
  shutdownTimeout: getEnv('SHUTDOWN_TIMEOUT_MS'),
  adapters,
  ...(managementPort ? { management: { port: managementPort } } : {}),
})
