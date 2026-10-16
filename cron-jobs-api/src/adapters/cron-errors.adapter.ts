import { defineAdapter, Logger, type ErrorInfo } from '@forinda/kickjs'

const log = Logger.for('CronErrors')

/**
 * A failed @Cron run reaches every error observer with `source: 'cron'` and
 * `context: { job, expression, trigger }`. This is where a Sentry/Datadog call
 * would go; here it logs, or hands the report to `report` (tests).
 */
export const CronErrorsAdapter = defineAdapter<{
  report?: (error: unknown, info: ErrorInfo) => void
}>({
  name: 'CronErrorsAdapter',
  build: ({ report }) => ({
    onError(error, info) {
      if (info.source !== 'cron') return
      if (report) return report(error, info)
      log.error({ err: error, ...info.context }, 'Cron job failed')
    },
  }),
})
