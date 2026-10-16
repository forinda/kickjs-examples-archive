import { defineAdapter, Logger, type ErrorInfo } from '@forinda/kickjs'

const log = Logger.for('JobErrors')

/**
 * Failed jobs reach every error observer with `source: 'job'` — QueueAdapter
 * reports each failed attempt (context: queue, job, id, attemptsMade) and
 * rethrows so BullMQ retries. This is where a Sentry/Datadog call would go;
 * here it logs, or hands the report to `report` (tests).
 */
export const JobErrorsAdapter = defineAdapter<{
  report?: (error: unknown, info: ErrorInfo) => void
}>({
  name: 'JobErrorsAdapter',
  build: ({ report }) => ({
    onError(error, info) {
      if (info.source !== 'job') return
      if (report) return report(error, info)
      log.error({ err: error, ...info.context }, 'Job attempt failed')
    },
  }),
})
