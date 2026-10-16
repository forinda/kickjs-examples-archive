/// <reference types="@forinda/kickjs-vite/globals" />
import { getEnv, KickCronAdapter, type AppAdapter } from '@forinda/kickjs'
import { WsAdapter } from '@forinda/kickjs-ws'
import { QueueAdapter } from '@forinda/kickjs-queue'
import { jwtStrategy } from '@/auth'
import { AuthAdapter } from '@/adapters/auth.adapter'
import { MongooseAdapter } from '@/adapters/mongoose.adapter'
import { RedisAdapter } from '@/adapters/redis.adapter'
import { swaggerAdapters } from '@/config/swagger'

const redisUrl = new URL(getEnv('REDIS_URL'))

const wsAdapter = WsAdapter({
  path: '/ws',
  heartbeatInterval: 30000,
  maxPayload: 1048576,
})

// Runs every `@Job` class (src/modules/queues) on BullMQ.
const queueAdapter = QueueAdapter({
  redis: {
    host: redisUrl.hostname,
    port: Number(redisUrl.port) || 6379,
    password: redisUrl.password || undefined,
  },
  queues: ['email', 'notifications', 'activity'],
  concurrency: 5,
})

export const adapters: AppAdapter[] = [
  MongooseAdapter({ uri: getEnv('MONGODB_URI') }),
  RedisAdapter({ url: getEnv('REDIS_URL') }),
  AuthAdapter({
    strategies: [
      jwtStrategy({
        secret: getEnv('JWT_SECRET'),
        mapPayload: (payload) => ({
          id: payload.sub as string,
          email: payload.email,
          globalRole: payload.globalRole ?? 'user',
        }),
      }),
    ],
    defaultPolicy: 'protected',
  }),
  wsAdapter,
  queueAdapter,
  // Schedules every `@Cron` method (src/modules/crons) with croner.
  KickCronAdapter(),
  // OpenAPI spec + UI under development/test only.
  ...swaggerAdapters(),
]

// DevTools (/_debug) in `kick dev` only: the vite plugin sets the flag false for
// `kick build`, so the import and the package drop out of the production bundle.
if (__KICKJS_DEVTOOLS__) {
  const { DevToolsAdapter } = await import('@forinda/kickjs-devtools')
  adapters.push(DevToolsAdapter({ secret: false, adapters: [wsAdapter, queueAdapter] }))
}
