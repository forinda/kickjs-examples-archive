import { Container, Service, listCronJobs, isCronJobEnabled, type CronRun } from '@forinda/kickjs'
import { Cron as Croner } from 'croner'

export interface LastRun {
  at: string
  trigger: CronRun['trigger']
  status: 'running' | 'ok' | 'failed'
  durationMs?: number
  error?: string
}

/** The next time `expression` fires after `from`, in `timezone` (server time when absent). */
export function nextRunOf(expression: string, timezone?: string, from = new Date()) {
  return new Croner(expression, { timezone, paused: true }).nextRun(from)
}

/**
 * Last-run bookkeeping and the job listing. In memory, per process.
 * ponytail: per-process history; persist it (DB/Redis) if several instances must agree.
 */
@Service()
export class CronService {
  private readonly lastRuns = new Map<string, LastRun>()

  /** Wrap a job body: records start, outcome and duration; rethrows so the framework reports it. */
  async track(run: CronRun, work: () => Promise<void>) {
    const started = Date.now()
    const entry: LastRun = {
      at: run.firedAt.toISOString(),
      trigger: run.trigger,
      status: 'running',
    }
    this.lastRuns.set(run.name, entry)
    try {
      await work()
      entry.status = 'ok'
    } catch (err) {
      entry.status = 'failed'
      entry.error = (err as Error).message
      throw err
    } finally {
      entry.durationMs = Date.now() - started
    }
  }

  list(from = new Date()) {
    return listCronJobs(Container.getInstance()).map((job) => {
      const enabled = isCronJobEnabled(job)
      return {
        name: job.name,
        description: job.description ?? null,
        expression: job.expression,
        timezone: job.timezone ?? null,
        scheduleId: job.scheduleId,
        enabled,
        lastRun: this.lastRuns.get(job.name) ?? null,
        nextRun: enabled
          ? (nextRunOf(job.expression, job.timezone, from)?.toISOString() ?? null)
          : null,
      }
    })
  }
}
