/// <reference types="@forinda/kickjs-vite/globals" />
import { getEnv, metricsAdapter, type AppAdapter } from '@forinda/kickjs'
import { QueueAdapter } from '@forinda/kickjs-queue'
import { JobErrorsAdapter } from '@/adapters/job-errors.adapter'
import { QueueHealthAdapter } from '@/adapters/queue-health.adapter'
import { JOB_QUEUES } from '@/modules/jobs/job.dto'

// The management port: health, Prometheus metrics and queue counts, off the
// public port. Without it the app serves its health on PORT, and no metrics.
export const managementPort = getEnv('MANAGEMENT_PORT')

export const adapters: AppAdapter[] = [
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
  ...(managementPort ? [metricsAdapter({ management: true })] : []),
]

// DevTools (/_debug) in `kick dev` only: the build sets __KICKJS_DEVTOOLS__ to false and
// drops this branch, so the package is not in the production bundle.
if (__KICKJS_DEVTOOLS__) {
  const { DevToolsAdapter } = await import('@forinda/kickjs-devtools')
  adapters.push(DevToolsAdapter())
}
