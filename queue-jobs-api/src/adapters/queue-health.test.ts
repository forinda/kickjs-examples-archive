import { describe, it, expect } from 'vitest'
import type { AddressInfo } from 'node:net'
import { Application, Container, expressRuntime, type AppAdapter } from '@forinda/kickjs'
import { QueueAdapter, type QueueProvider } from '@forinda/kickjs-queue'
import { QueueHealthAdapter } from './queue-health.adapter'

/** Queues without Redis: just the reads the health check and /queues make. */
const provider: QueueProvider = {
  addJob: async () => ({}),
  createWorker: () => {},
  getQueue: () => ({
    count: async () => 0,
    getJobCounts: async () => ({ waiting: 2, active: 1, failed: 0 }),
  }),
  shutdown: async () => {},
} as QueueProvider

describe('the management port', () => {
  it('serves health and queue counts there, and neither on the public port', async () => {
    Container.reset()
    const ports: { app?: number; management?: number } = {}
    const spy: AppAdapter = {
      name: 'Ports',
      afterStart({ server, management }) {
        ports.app = (server!.address() as AddressInfo).port
        ports.management = (management!.server!.address() as AddressInfo).port
      },
    }
    const app = new Application({
      modules: [],
      runtime: expressRuntime(),
      adapters: [QueueAdapter({ provider, queues: ['emails'] }), QueueHealthAdapter(), spy],
      port: 0,
      management: { port: 0, host: '127.0.0.1' },
    })
    await app.start()
    try {
      const management = (path: string) => fetch(`http://127.0.0.1:${ports.management}${path}`)
      const publicPort = (path: string) => fetch(`http://127.0.0.1:${ports.app}${path}`)

      const ready = await management('/health/ready')
      expect(ready.status).toBe(200)
      const { checks } = (await ready.json()) as { checks: unknown[] }
      expect(checks).toContainEqual({ name: 'redis', status: 'up' })
      expect(await (await management('/queues')).json()).toEqual({
        emails: { waiting: 2, active: 1, failed: 0 },
      })

      expect((await publicPort('/health/ready')).status).toBe(404)
      expect((await publicPort('/queues')).status).toBe(404)
    } finally {
      await app.shutdown()
    }
  })
})
