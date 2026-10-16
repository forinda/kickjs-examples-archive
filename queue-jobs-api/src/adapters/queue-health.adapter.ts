import { defineAdapter, type Container } from '@forinda/kickjs'
import { QUEUE_MANAGER } from '@forinda/kickjs-queue'

/**
 * Feeds `GET /health/ready` with one cheap Redis read (a queue's job count)
 * over the queue's existing connection. Redis down → the framework's
 * per-check timeout marks it down.
 * QueueAdapter owns the connections (and closes them on shutdown, after the
 * workers have finished their active jobs); this only reports on them.
 */
export const QueueHealthAdapter = defineAdapter({
  name: 'QueueHealthAdapter',
  build: () => {
    let container: Container | undefined
    return {
      beforeStart(ctx) {
        container = ctx.container as Container
      },
      async onHealthCheck() {
        try {
          const queues = container!.resolve(QUEUE_MANAGER)
          const [first] = queues.getQueueNames()
          await queues.getQueue(first)!.count()
          return { name: 'redis', status: 'up' as const }
        } catch {
          return { name: 'redis', status: 'down' as const }
        }
      },
    }
  },
})
