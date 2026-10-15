import Redis from 'ioredis'
import { defineAdapter, Logger } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'

const logger = Logger.for('RedisAdapter')

/** Opens an ioredis client and registers it under `TOKENS.REDIS` (presence, health checks). */
export const RedisAdapter = defineAdapter<{ url: string }>({
  name: 'RedisAdapter',
  build: ({ url }) => {
    let client: Redis | undefined
    return {
      beforeStart({ container }) {
        client = new Redis(url)
        client.on('error', (err) => logger.error(err, 'Redis error'))
        container.registerInstance(TOKENS.REDIS, client)
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
