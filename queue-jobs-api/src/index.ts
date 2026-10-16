/// <reference types="@forinda/kickjs-vite/globals" />
import 'reflect-metadata'
// Side-effect import — registers the env schema before anything reads it.
import './config'
import express from 'express'
import { bootstrap, expressRuntime, getEnv, type AppAdapter } from '@forinda/kickjs'
import { QueueAdapter } from '@forinda/kickjs-queue'
import { JobErrorsAdapter } from './adapters/job-errors.adapter'
import { QueueHealthAdapter } from './adapters/queue-health.adapter'
import { JOB_QUEUES } from './modules/jobs/job.dto'
import { modules } from './modules'

/*
 * One codebase, three ways to run it (APP_ROLE):
 *   all    — API + workers in one process (default; `pnpm dev`)
 *   api    — dispatches jobs, runs none
 *   worker — runs jobs, no API routes (`pnpm worker`, src/worker.ts)
 */
const role = getEnv('APP_ROLE')

// Importing the @Job classes is what starts their workers.
if (role !== 'api') await import('./modules/jobs/job.processors')

const adapters: AppAdapter[] = [
  QueueAdapter({
    redis: {
      host: getEnv('REDIS_HOST'),
      port: getEnv('REDIS_PORT'),
      password: getEnv('REDIS_PASSWORD'),
    },
    // An API-only process has no @Job classes, so name the queues it adds to.
    queues: JOB_QUEUES,
    concurrency: getEnv('QUEUE_CONCURRENCY'),
  }),
  QueueHealthAdapter(),
  JobErrorsAdapter(),
]

// DevTools (/_debug) in `kick dev` only: the build sets __KICKJS_DEVTOOLS__ to false and
// drops this branch, so the package is not in the production bundle.
if (__KICKJS_DEVTOOLS__) {
  const { DevToolsAdapter } = await import('@forinda/kickjs-devtools')
  adapters.push(DevToolsAdapter())
}

export const app = await bootstrap({
  modules: role === 'worker' ? [] : modules,
  runtime: expressRuntime(),
  port: role === 'worker' ? getEnv('WORKER_PORT') : getEnv('PORT'),
  middlewares: [express.json()],
  // On SIGTERM, QueueAdapter closes its workers, and BullMQ's worker.close()
  // waits for the jobs they're running. This bounds that wait.
  shutdownTimeout: getEnv('SHUTDOWN_TIMEOUT_MS'),
  adapters,
})
