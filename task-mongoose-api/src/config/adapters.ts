import { getEnv, KickCronAdapter } from '@forinda/kickjs'
import { DevToolsAdapter } from '@forinda/kickjs-devtools'
import { SwaggerAdapter } from '@forinda/kickjs-swagger'
import { WsAdapter } from '@forinda/kickjs-ws'
import { QueueAdapter } from '@forinda/kickjs-queue'
import { jwtStrategy } from '@/auth'
import { AuthAdapter } from '@/adapters/auth.adapter'
import { MongooseAdapter } from '@/adapters/mongoose.adapter'
import { RedisAdapter } from '@/adapters/redis.adapter'
import { isDevOrTest } from '@/config/dev-default'

const redisUrl = new URL(getEnv('REDIS_URL'))

const wsAdapter = WsAdapter({
  path: '/ws',
  heartbeatInterval: 30000,
  maxPayload: 1048576,
})

// Runs every `@Job` class (src/modules/queue) on BullMQ.
const queueAdapter = QueueAdapter({
  redis: {
    host: redisUrl.hostname,
    port: Number(redisUrl.port) || 6379,
    password: redisUrl.password || undefined,
  },
  queues: ['email', 'notifications', 'activity'],
  concurrency: 5,
})

export const adapters = [
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
  // Schedules every `@Cron` method (src/modules/cron) with croner.
  KickCronAdapter(),
  // /_debug only under development/test. Its own default (`NODE_ENV !== 'production'`)
  // would turn it on with NODE_ENV unset — fail closed instead.
  DevToolsAdapter({
    enabled: isDevOrTest(),
    secret: false,
    adapters: [wsAdapter, queueAdapter],
  }),
  SwaggerAdapter({
    info: { title: 'Vibed API', version: '1.0.0', description: 'Task management API' },
    bearerAuth: true,
    publicFlag: 'auth.public',
  }),
]
