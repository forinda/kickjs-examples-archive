import Redis from 'ioredis'
import { createToken, defineAdapter, Logger } from '@forinda/kickjs'

export const REDIS_CLIENT = createToken<Redis>('app/Redis/client')

const logger = Logger.for('RedisAdapter')

/** Opens an ioredis client and registers it under `REDIS_CLIENT` (presence, health checks). */
export const RedisAdapter = defineAdapter<{ url: string }>({
  name: 'RedisAdapter',
  build: ({ url }) => {
    let client: Redis | undefined
    return {
      beforeStart({ container }) {
        client = new Redis(url)
        client.on('error', (err) => logger.error(err, 'Redis error'))
        container.registerInstance(REDIS_CLIENT, client)
      },
      // Feeds GET /health/ready.
      async onHealthCheck() {
        const up = await client?.ping().then(
          (r) => r === 'PONG',
          () => false,
        )
        return { name: 'redis', status: up ? ('up' as const) : ('down' as const) }
      },
      async shutdown() {
        await client?.quit()
      },
    }
  },
})
