/// <reference types="@forinda/kickjs-vite/globals" />
import 'reflect-metadata'
// Side-effect import — registers the env schema before anything reads it.
import './config'
import { bootstrap, expressRuntime, getEnv, type AppAdapter } from '@forinda/kickjs'
import { WsAdapter } from '@forinda/kickjs-ws'
import { redisBroker } from '@forinda/kickjs-ws/redis'
import { modules } from './modules'
import { resolveSocketUser } from './auth'
import { createRedisClients, RedisAdapter } from './adapters/redis.adapter'
import { PublicPageAdapter } from './adapters/public-page.adapter'
import { DrainNoticeAdapter } from './adapters/drain-notice.adapter'

// With REDIS_URL, every instance relays room broadcasts through Redis pub/sub
// and keeps presence in Redis; without it, one process holds everything.
const redisUrl = getEnv('REDIS_URL')
const redis = redisUrl ? createRedisClients(redisUrl) : null

const adapters: AppAdapter[] = [
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
  // On shutdown, tells this instance's clients to reconnect elsewhere (app.status).
  DrainNoticeAdapter(),
  PublicPageAdapter(),
]

// DevTools (/_debug) in `kick dev` only: the build sets __KICKJS_DEVTOOLS__ to false and
// drops this branch, so the package is not in the production bundle.
if (__KICKJS_DEVTOOLS__) {
  const { DevToolsAdapter } = await import('@forinda/kickjs-devtools')
  adapters.push(DevToolsAdapter())
}

export const app = await bootstrap({
  modules,
  runtime: expressRuntime(),
  adapters,
})
