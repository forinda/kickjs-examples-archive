import { createToken, defineAdapter } from '@forinda/kickjs'
import { Redis } from 'ioredis'

/** The command connection. Bound only when REDIS_URL is set. */
export const REDIS = createToken<Redis>('app/Redis')

export interface RedisClients {
  publisher: Redis
  /** Its own connection: a Redis connection in subscribe mode can't run other commands. */
  subscriber: Redis
}

export function createRedisClients(url: string): RedisClients {
  const publisher = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2 })
  return { publisher, subscriber: publisher.duplicate() }
}

/**
 * Owns the Redis connections the WS broker and the presence repository use:
 * connects (and fails boot if Redis is down), binds REDIS, answers
 * `GET /health/ready` with a PING, and closes both connections on shutdown.
 */
export const RedisAdapter = defineAdapter<RedisClients>({
  name: 'RedisAdapter',
  build: ({ publisher, subscriber }) => ({
    async beforeStart({ container }) {
      await Promise.all([publisher.connect(), subscriber.connect()])
      container.registerInstance(REDIS, publisher)
    },
    async onHealthCheck() {
      try {
        await publisher.ping()
        return { name: 'redis', status: 'up' as const }
      } catch {
        return { name: 'redis', status: 'down' as const }
      }
    },
    async shutdown() {
      await Promise.allSettled([publisher.quit(), subscriber.quit()])
    },
  }),
})
