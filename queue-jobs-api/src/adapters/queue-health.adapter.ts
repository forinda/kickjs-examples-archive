import { defineAdapter, type Container } from '@forinda/kickjs'
import { QUEUE_MANAGER } from '@forinda/kickjs-queue'

/**
 * Feeds `GET /health/ready` with one cheap Redis read (a queue's job count)
 * over the queue's existing connection. Redis down → the framework's
 * per-check timeout marks it down.
 *
 * With a management port (`MANAGEMENT_PORT`) it also serves `GET /queues` there:
 * each queue's job counts, for an operator — never on the public API.
 * QueueAdapter owns the connections (and closes them on shutdown, after the
 * workers have finished their active jobs); this only reports on them.
 */
export const QueueHealthAdapter = defineAdapter({
  name: 'QueueHealthAdapter',
  build: () => {
    let container: Container | undefined
    return {
      beforeMount({ management }) {
        management?.http.route('GET', '/queues', async (ctx) => {
          const queues = container!.resolve(QUEUE_MANAGER)
          const counts = await Promise.all(
            queues
              .getQueueNames()
              .map(
                async (name: string) =>
                  [name, await queues.getQueue(name)!.getJobCounts()] as const,
              ),
          )
          ctx.json(Object.fromEntries(counts))
        })
      },
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
