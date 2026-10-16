import {
  Controller,
  Delete,
  Get,
  HttpException,
  Inject,
  JOB_DISPATCHER,
  Post,
  Put,
  reply,
  type Ctx,
  type JobDispatcher,
} from '@forinda/kickjs'
import { QUEUE_MANAGER, type QueueService } from '@forinda/kickjs-queue'
import {
  DIGEST_SCHEDULER,
  EMAIL_QUEUE,
  JOB_QUEUES,
  REPORTS_QUEUE,
  bulkEmailSchema,
  digestScheduleSchema,
  reminderSchema,
  reportSchema,
  sendEmailSchema,
} from './jobs.dto'

/** Retries with exponential backoff: 1s, 2s, 4s between attempts. */
const RETRY = { attempts: 4, backoff: { type: 'exponential', delay: 1000 } }

const idOf = (job: unknown) => (job as { id?: string }).id

@Controller()
export class JobsController {
  // Backend-neutral: the controller never names BullMQ to enqueue.
  @Inject(JOB_DISPATCHER) private readonly jobs!: JobDispatcher
  // BullMQ-specific reads (status, bulk, schedulers) go through the queue manager.
  @Inject(QUEUE_MANAGER) private readonly queues!: QueueService

  @Post('/emails', { body: sendEmailSchema })
  async sendEmail(ctx: Ctx<KickRoutes.JobsController['sendEmail']>) {
    const job = await this.jobs.dispatch(EMAIL_QUEUE, 'send', ctx.body, RETRY)
    return reply.accepted({ jobId: idOf(job) })
  }

  @Post('/emails/bulk', { body: bulkEmailSchema })
  async sendBulk(ctx: Ctx<KickRoutes.JobsController['sendBulk']>) {
    const jobs = await this.queues.addBulk(
      EMAIL_QUEUE,
      ctx.body.recipients.map((to) => ({
        name: 'send',
        data: { to, subject: ctx.body.subject },
        opts: RETRY,
      })),
    )
    return reply.accepted({ jobIds: jobs.map(idOf) })
  }

  @Post('/reminders', { body: reminderSchema })
  async remind(ctx: Ctx<KickRoutes.JobsController['remind']>) {
    const { delayMs, ...email } = ctx.body
    const job = await this.jobs.dispatch(EMAIL_QUEUE, 'send', email, { ...RETRY, delay: delayMs })
    return reply.accepted({ jobId: idOf(job), runAt: new Date(Date.now() + delayMs).toISOString() })
  }

  @Post('/reports', { body: reportSchema })
  async buildReport(ctx: Ctx<KickRoutes.JobsController['buildReport']>) {
    const job = await this.jobs.dispatch(REPORTS_QUEUE, 'build', ctx.body)
    return reply.accepted({ jobId: idOf(job) })
  }

  /** Repeatable job: BullMQ's job scheduler re-enqueues `digest` every `everyMs`. */
  @Put('/schedules/digest', { body: digestScheduleSchema })
  async scheduleDigest(ctx: Ctx<KickRoutes.JobsController['scheduleDigest']>) {
    await this.queue(REPORTS_QUEUE).upsertJobScheduler(
      DIGEST_SCHEDULER,
      { every: ctx.body.everyMs },
      { name: 'digest' },
    )
    return { scheduler: DIGEST_SCHEDULER, everyMs: ctx.body.everyMs }
  }

  @Delete('/schedules/digest')
  async unscheduleDigest(_ctx: Ctx<KickRoutes.JobsController['unscheduleDigest']>) {
    await this.queue(REPORTS_QUEUE).removeJobScheduler(DIGEST_SCHEDULER)
    return reply.noContent()
  }

  @Get('/:queue/:id')
  async status(ctx: Ctx<KickRoutes.JobsController['status']>) {
    const job = await this.queue(ctx.params.queue).getJob(ctx.params.id)
    if (!job) throw HttpException.notFound(`Job ${ctx.params.id} not found`)
    return {
      id: job.id,
      name: job.name,
      state: await job.getState(),
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason ?? null,
      result: job.returnvalue ?? null,
    }
  }

  private queue(name: string) {
    const queue = JOB_QUEUES.includes(name) ? this.queues.getQueue(name) : undefined
    if (!queue) throw HttpException.notFound(`Unknown queue "${name}"`)
    return queue
  }
}
