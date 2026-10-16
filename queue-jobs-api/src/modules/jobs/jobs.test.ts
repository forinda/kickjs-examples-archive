import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { Container, type ErrorInfo } from '@forinda/kickjs'
import { createTestApp } from '@forinda/kickjs-testing'
import { QueueAdapter, type QueueProvider } from '@forinda/kickjs-queue'
import { JobErrorsAdapter } from '@/adapters/job-errors.adapter'
import { JOB_QUEUES } from './jobs.dto'
import { JobsModule } from './jobs.module'
import './jobs.processors'

type Processor = (job: MemoryJob) => Promise<void>

/** The slice of a BullMQ Job the handlers and the status endpoint use. */
class MemoryJob {
  state = 'waiting'
  attemptsMade = 0
  progress: number | object = 0
  failedReason?: string
  returnvalue = null
  constructor(
    readonly id: string,
    readonly name: string,
    readonly data: any,
    readonly opts: Record<string, any>,
  ) {}
  async updateProgress(progress: number) {
    this.progress = progress
  }
  async getState() {
    return this.state
  }
}

/**
 * A QueueProvider without Redis: jobs run in-process, retried up to
 * `opts.attempts` (backoff not waited), delayed jobs stay 'delayed'.
 * getQueue() returns the BullMQ Queue methods the controller calls.
 */
class InMemoryQueueProvider implements QueueProvider {
  jobs = new Map<string, MemoryJob>()
  schedulers = new Map<string, unknown>()
  private workers = new Map<string, Processor>()
  private running = new Set<Promise<void>>()
  private seq = 0

  async addJob(queue: string, name: string, data: unknown, opts: Record<string, any> = {}) {
    const job = new MemoryJob(String(++this.seq), name, data, opts)
    this.jobs.set(job.id, job)
    if (opts.delay) job.state = 'delayed'
    else this.track(this.run(queue, job))
    return job
  }

  createWorker(queue: string, processor: Processor) {
    this.workers.set(queue, processor)
  }

  getQueue(name: string) {
    return {
      name,
      getJob: async (id: string) => this.jobs.get(id),
      upsertJobScheduler: async (id: string, repeat: unknown, template: unknown) => {
        this.schedulers.set(id, { repeat, template })
      },
      removeJobScheduler: async (id: string) => this.schedulers.delete(id),
    }
  }

  /** Resolves once every running job has settled. */
  async idle() {
    while (this.running.size) await Promise.all(this.running)
  }

  async shutdown() {
    await this.idle()
  }

  private track(run: Promise<void>) {
    this.running.add(run)
    void run.finally(() => this.running.delete(run))
  }

  private async run(queue: string, job: MemoryJob) {
    await Promise.resolve()
    const attempts = job.opts.attempts ?? 1
    for (;;) {
      job.state = 'active'
      try {
        await this.workers.get(queue)!(job)
        job.attemptsMade++ // BullMQ 6 counts the successful attempt too
        job.state = 'completed'
        return
      } catch (err) {
        job.attemptsMade++
        if (job.attemptsMade >= attempts) {
          job.state = 'failed'
          job.failedReason = (err as Error).message
          return
        }
      }
    }
  }
}

async function makeApp() {
  const provider = new InMemoryQueueProvider()
  const reports: Array<{ error: unknown; info: ErrorInfo }> = []
  const { app } = await createTestApp({
    modules: [JobsModule()],
    adapters: [
      QueueAdapter({ provider, queues: JOB_QUEUES }),
      JobErrorsAdapter({ report: (error, info) => reports.push({ error, info }) }),
    ],
  })
  return { http: request(app.handle.bind(app)), provider, reports }
}

describe('JobsController', () => {
  beforeEach(() => Container.reset())

  it('dispatches an email and answers 202 with the job id', async () => {
    const { http, provider } = await makeApp()
    const res = await http
      .post('/api/v1/jobs/emails')
      .send({ to: 'a@example.test', subject: 'Hi' })
      .expect(202)
    expect(res.body.jobId).toBeDefined()

    await provider.idle()
    const status = await http.get(`/api/v1/jobs/email/${res.body.jobId}`).expect(200)
    expect(status.body).toMatchObject({ name: 'send', state: 'completed', attemptsMade: 1 })
  })

  it('retries a failing job with backoff options and reports each failed attempt', async () => {
    const { http, provider, reports } = await makeApp()
    const res = await http
      .post('/api/v1/jobs/emails')
      .send({ to: 'a@example.test', subject: 'Hi', failTimes: 2 })
      .expect(202)

    await provider.idle()
    const job = provider.jobs.get(res.body.jobId)!
    expect(job.opts).toMatchObject({ attempts: 4, backoff: { type: 'exponential', delay: 1000 } })
    expect(job.state).toBe('completed')
    expect(job.attemptsMade).toBe(3) // two failures, then success
    expect(reports).toHaveLength(2)
    expect(reports[0].info).toMatchObject({
      source: 'job',
      context: { queue: 'email', job: 'send', id: res.body.jobId },
    })
  })

  it('marks a job failed once its attempts run out', async () => {
    const { http, provider, reports } = await makeApp()
    const res = await http
      .post('/api/v1/jobs/emails')
      .send({ to: 'a@example.test', subject: 'Hi', failTimes: 9 })
      .expect(202)

    await provider.idle()
    const status = await http.get(`/api/v1/jobs/email/${res.body.jobId}`).expect(200)
    expect(status.body).toMatchObject({ state: 'failed', attemptsMade: 4 })
    expect(status.body.failedReason).toMatch(/SMTP unavailable/)
    expect(reports).toHaveLength(4)
  })

  it('dispatches in bulk', async () => {
    const { http, provider } = await makeApp()
    const res = await http
      .post('/api/v1/jobs/emails/bulk')
      .send({ subject: 'News', recipients: ['a@example.test', 'b@example.test', 'c@example.test'] })
      .expect(202)
    expect(res.body.jobIds).toHaveLength(3)

    await provider.idle()
    for (const id of res.body.jobIds) expect(provider.jobs.get(id)!.state).toBe('completed')
  })

  it('delays a reminder', async () => {
    const { http, provider } = await makeApp()
    const res = await http
      .post('/api/v1/jobs/reminders')
      .send({ to: 'a@example.test', subject: 'Later', delayMs: 60_000 })
      .expect(202)

    const job = provider.jobs.get(res.body.jobId)!
    expect(job.opts.delay).toBe(60_000)
    expect(job.state).toBe('delayed')
    expect(Date.parse(res.body.runAt)).toBeGreaterThan(Date.now() + 55_000)
  })

  it('reports progress from a long job', async () => {
    const { http, provider } = await makeApp()
    const res = await http.post('/api/v1/jobs/reports').send({ rows: 10 }).expect(202)

    await provider.idle()
    const status = await http.get(`/api/v1/jobs/reports/${res.body.jobId}`).expect(200)
    expect(status.body).toMatchObject({ state: 'completed', progress: 100 })
  })

  it('upserts and removes the repeatable digest', async () => {
    const { http, provider } = await makeApp()
    await http.put('/api/v1/jobs/schedules/digest').send({ everyMs: 60_000 }).expect(200)
    expect(provider.schedulers.get('daily-digest')).toEqual({
      repeat: { every: 60_000 },
      template: { name: 'digest' },
    })

    await http.delete('/api/v1/jobs/schedules/digest').expect(204)
    expect(provider.schedulers.size).toBe(0)
  })

  it('answers 404 for an unknown queue or job, and rejects a bad body', async () => {
    const { http } = await makeApp()
    await http.get('/api/v1/jobs/nope/1').expect(404)
    await http.get('/api/v1/jobs/email/999').expect(404)
    const bad = await http.post('/api/v1/jobs/emails').send({ to: 'not-an-email', subject: '' })
    expect(bad.status).toBeGreaterThanOrEqual(400)
    expect(bad.status).toBeLessThan(500)
  })
})
