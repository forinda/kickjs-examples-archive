import 'reflect-metadata'
// Side-effect import — registers the env schema before anything reads it.
import './config'
import { bootstrap, expressRuntime, getEnv } from '@forinda/kickjs'
import { WsAdapter } from '@forinda/kickjs-ws'
import { redisBroker } from '@forinda/kickjs-ws/redis'
import { modules } from './modules'
import { resolveSocketUser } from './auth'
import { createRedisClients, RedisAdapter } from './adapters/redis.adapter'
import { PublicPageAdapter } from './adapters/public-page.adapter'

// With REDIS_URL, every instance relays room broadcasts through Redis pub/sub
// and keeps presence in Redis; without it, one process holds everything.
const redisUrl = getEnv('REDIS_URL')
const redis = redisUrl ? createRedisClients(redisUrl) : null

export const app = await bootstrap({
  modules,
  runtime: expressRuntime(),
  adapters: [
    ...(redis ? [RedisAdapter(redis)] : []),
    WsAdapter({
      path: '/ws',
      heartbeatInterval: getEnv('WS_HEARTBEAT_MS'),
      maxPayload: 16 * 1024,
      auth: { resolveUser: resolveSocketUser },
      // `close: undefined`: RedisAdapter quits both connections, which ends the subscription.
      // The broker's own unsubscribe would race that quit (adapters shut down concurrently).
      broker: redis
        ? { ...redisBroker({ ...redis, channel: 'ws-chat' }), close: undefined }
        : undefined,
    }),
    PublicPageAdapter(),
  ],
})
