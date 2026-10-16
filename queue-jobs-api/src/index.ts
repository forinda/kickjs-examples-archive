import 'reflect-metadata'
import { env } from './config'
import express from 'express'
import { bootstrap, expressRuntime } from '@forinda/kickjs'
import { QueueAdapter } from '@forinda/kickjs-queue'
import { JobErrorsAdapter } from './adapters/job-errors.adapter'
import { QueueHealthAdapter } from './adapters/queue-health.adapter'
import { JOB_QUEUES } from './modules/jobs/jobs.dto'
import { modules } from './modules'

/*
 * One codebase, three ways to run it (APP_ROLE):
 *   all    — API + workers in one process (default; `pnpm dev`)
 *   api    — dispatches jobs, runs none
 *   worker — runs jobs, no API routes (`pnpm worker`, src/worker.ts)
 */
const role = env.APP_ROLE

// Importing the @Job classes is what starts their workers.
if (role !== 'api') await import('./modules/jobs/jobs.processors')

export const app = await bootstrap({
  modules: role === 'worker' ? [] : modules,
  runtime: expressRuntime(),
  port: role === 'worker' ? env.WORKER_PORT : env.PORT,
  middlewares: [express.json()],
  // On SIGTERM, QueueAdapter closes its workers, and BullMQ's worker.close()
  // waits for the jobs they're running. This bounds that wait.
  shutdownTimeout: env.SHUTDOWN_TIMEOUT_MS,
  adapters: [
    QueueAdapter({
      redis: { host: env.REDIS_HOST, port: env.REDIS_PORT, password: env.REDIS_PASSWORD },
      // An API-only process has no @Job classes, so name the queues it adds to.
      queues: JOB_QUEUES,
      concurrency: env.QUEUE_CONCURRENCY,
    }),
    QueueHealthAdapter(),
    JobErrorsAdapter(),
  ],
})
