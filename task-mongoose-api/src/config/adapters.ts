import { KickCronAdapter } from '@forinda/kickjs'
import { DevToolsAdapter } from '@forinda/kickjs-devtools'
import { SwaggerAdapter } from '@forinda/kickjs-swagger'
import { WsAdapter } from '@forinda/kickjs-ws'
import { QueueAdapter } from '@forinda/kickjs-queue'
import { AuthAdapter, jwtStrategy } from '@/auth'
import { MongooseAdapter } from '@/shared/infrastructure/database/mongoose.adapter'
import { RedisAdapter } from '@/shared/infrastructure/redis/redis.config'
import { env } from '.'

const redisUrl = new URL(env.REDIS_URL)

const wsAdapter = WsAdapter({
  path: '/ws',
  heartbeatInterval: 30000,
  maxPayload: 1048576,
})

// Runs every `@Job` class (src/modules/queue/infrastructure/processors) on BullMQ.
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
  MongooseAdapter({ uri: env.MONGODB_URI }),
  RedisAdapter({ url: env.REDIS_URL }),
  AuthAdapter({
    strategies: [
      jwtStrategy({
        secret: env.JWT_SECRET,
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
  // Schedules every `@Cron` method (src/modules/cron/infrastructure/jobs) with croner.
  KickCronAdapter(),
  DevToolsAdapter({
    secret: env.NODE_ENV === 'production' ? undefined : false,
    adapters: [wsAdapter, queueAdapter],
  }),
  SwaggerAdapter({
    info: { title: 'Vibed API', version: '1.0.0', description: 'Task management API' },
    bearerAuth: true,
    publicFlag: 'auth.public',
  }),
]
