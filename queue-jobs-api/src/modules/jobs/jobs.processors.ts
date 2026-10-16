import { Job, Logger, Process } from '@forinda/kickjs'
import type { Job as BullJob } from 'bullmq'
import { EMAIL_QUEUE, REPORTS_QUEUE, type EmailData, type ReportData } from './jobs.dto'

/*
 * The handlers. Importing this file is what makes a process a worker:
 * QueueAdapter starts one BullMQ worker per queue a resolvable @Job class
 * handles. src/index.ts imports it unless APP_ROLE=api.
 *
 * With BullMQ the handler gets BullMQ's own Job, so attemptsMade and
 * updateProgress() are there; what a handler returns becomes the job's
 * returnvalue (GET /jobs/:queue/:id shows it).
 */

const log = Logger.for('Jobs')
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

@Job(EMAIL_QUEUE)
export class EmailJobs {
  @Process('send')
  async send(job: BullJob<EmailData>) {
    const { to, subject, failTimes = 0 } = job.data
    // A throw is reported to the error observers (source: 'job') and rethrown,
    // so BullMQ retries it with the job's attempts/backoff.
    if (job.attemptsMade < failTimes) {
      throw new Error(`SMTP unavailable (attempt ${job.attemptsMade + 1})`)
    }
    log.info(`Sent "${subject}" to ${to}`)
    return { deliveredAt: new Date().toISOString(), attempts: job.attemptsMade + 1 }
  }
}

@Job(REPORTS_QUEUE)
export class ReportJobs {
  /** A long job: reports progress after each chunk. */
  @Process('build')
  async build(job: BullJob<ReportData>) {
    const chunks = 10
    for (let i = 1; i <= chunks; i++) {
      await sleep(Math.min(job.data.rows, 5000) / 10)
      await job.updateProgress(Math.round((i / chunks) * 100))
    }
    log.info(`Report ${job.id} built (${job.data.rows} rows)`)
    return { rows: job.data.rows, url: `/reports/${job.id}.csv` }
  }

  /** Fired by the repeatable job scheduler (PUT /jobs/schedules/digest). */
  @Process('digest')
  async digest(job: BullJob) {
    log.info(`Digest run ${job.id}`)
    return { ranAt: new Date().toISOString() }
  }
}
