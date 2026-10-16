import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import {
  Container,
  createHandler,
  cronScheduleId,
  expressRuntime,
  runCronJobs,
  type ErrorInfo,
} from '@forinda/kickjs'
import { createTestApp } from '@forinda/kickjs-testing'
import { CronErrorsAdapter } from '@/adapters/cron-errors.adapter'
import { CronModule } from './cron.module'
import { MaintenanceJobs } from './cron.jobs'
import { nextRunOf } from './cron.service'

const SECRET = 'test-cron-secret-0123456789'
const bearer = { authorization: `Bearer ${SECRET}` }

async function makeApp() {
  const reports: Array<{ error: unknown; info: ErrorInfo }> = []
  const { app } = await createTestApp({
    modules: [CronModule()],
    adapters: [CronErrorsAdapter({ report: (error, info) => reports.push({ error, info }) })],
  })
  return { http: request(app.handle.bind(app)), reports }
}

const run = (name: string) => runCronJobs(Container.getInstance(), { name }, 'manual')

describe('next run times', () => {
  const from = new Date('2026-01-15T10:00:00Z')

  it('follows each schedule', () => {
    expect(nextRunOf('*/5 * * * *', undefined, from)?.toISOString()).toBe(
      '2026-01-15T10:05:00.000Z',
    )
    expect(nextRunOf('*/2 * * * *', undefined, from)?.toISOString()).toBe(
      '2026-01-15T10:02:00.000Z',
    )
    expect(nextRunOf('0 * * * *', undefined, from)?.toISOString()).toBe('2026-01-15T11:00:00.000Z')
  })

  it('computes 02:00 Nairobi as 23:00 UTC', () => {
    expect(nextRunOf('0 2 * * *', 'Africa/Nairobi', from)?.toISOString()).toBe(
      '2026-01-15T23:00:00.000Z',
    )
    const afterIt = new Date('2026-01-15T23:30:00Z')
    expect(nextRunOf('0 2 * * *', 'Africa/Nairobi', afterIt)?.toISOString()).toBe(
      '2026-01-16T23:00:00.000Z',
    )
  })
})

describe('cron jobs', () => {
  beforeEach(() => Container.reset())
  afterEach(() => vi.restoreAllMocks())

  it('lists every job with schedule, enabled state and next run', async () => {
    const { http } = await makeApp()
    const { body } = await http.get('/api/v1/cron/jobs').expect(200)
    const byName = Object.fromEntries(body.map((j: { name: string }) => [j.name, j]))

    expect(Object.keys(byName).sort()).toEqual([
      'nightly-report',
      'purge-sessions',
      'sync-inventory',
      'warm-cache',
    ])
    expect(byName['nightly-report']).toMatchObject({
      timezone: 'Africa/Nairobi',
      enabled: true,
      lastRun: null,
    })
    expect(Date.parse(byName['nightly-report'].nextRun)).toBeGreaterThan(Date.now())
    // Disabled through CRON_DISABLED_JOBS (vitest.config.ts).
    expect(byName['purge-sessions']).toMatchObject({ enabled: false, nextRun: null })
  })

  it('runs a job directly and records its last run', async () => {
    const { http } = await makeApp()
    expect(await run('warm-cache')).toEqual({ ran: 1, failed: 0 })

    const { body } = await http.get('/api/v1/cron/jobs').expect(200)
    const job = body.find((j: { name: string }) => j.name === 'warm-cache')
    expect(job.lastRun).toMatchObject({ trigger: 'manual', status: 'ok' })
  })

  it('skips a disabled job', async () => {
    await makeApp()
    expect(await run('purge-sessions')).toEqual({ ran: 0, failed: 0 })
  })

  it('skips a run while the previous one is still going', async () => {
    await makeApp()
    const first = run('sync-inventory')
    expect(await run('sync-inventory')).toEqual({ ran: 0, failed: 0 })
    expect(await first).toEqual({ ran: 1, failed: 0 })
  })

  it('reports a failed run to the error observers', async () => {
    const { http, reports } = await makeApp()
    vi.spyOn(MaintenanceJobs.prototype as any, 'fetchSupplierStock').mockRejectedValue(
      new Error('supplier down'),
    )

    expect(await run('sync-inventory')).toEqual({ ran: 0, failed: 1 })
    expect(reports).toHaveLength(1)
    expect(reports[0].info).toMatchObject({
      source: 'cron',
      context: { job: 'sync-inventory', expression: '*/2 * * * *', trigger: 'manual' },
    })
    const { body } = await http.get('/api/v1/cron/jobs')
    const job = body.find((j: { name: string }) => j.name === 'sync-inventory')
    expect(job.lastRun).toMatchObject({ status: 'failed', error: 'supplier down' })
  })

  it('guards the manual run endpoint with CRON_SECRET', async () => {
    const { http } = await makeApp()
    await http.post('/api/v1/cron/jobs/warm-cache/run').expect(401)
    await http
      .post('/api/v1/cron/jobs/warm-cache/run')
      .set({ authorization: 'Bearer nope' })
      .expect(401)
    await http.post('/api/v1/cron/jobs/nope/run').set(bearer).expect(404)
    const res = await http.post('/api/v1/cron/jobs/warm-cache/run').set(bearer).expect(200)
    expect(res.body).toEqual({ ran: 1, failed: 0 })
  })
})

describe('serverless trigger', () => {
  beforeEach(() => Container.reset())

  it('runs the jobs on a schedule when called with the CRON_SECRET bearer', async () => {
    const handler = createHandler({ modules: [CronModule()], runtime: expressRuntime() })
    try {
      const url = `http://localhost/_kick/cron/${cronScheduleId('0 * * * *')}`
      expect((await handler.fetch(new Request(url))).status).toBe(401)

      const res = await handler.fetch(new Request(url, { headers: bearer }))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ran: 1, failed: 0 }) // warm-cache
    } finally {
      await handler.close()
    }
  })
})
