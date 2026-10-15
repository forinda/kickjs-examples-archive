import { PrismaAdapter } from '@/adapters/prisma.adapter'
import { DevToolsAdapter } from '@forinda/kickjs-devtools'
import { SwaggerAdapter } from '@forinda/kickjs-swagger'
import { WsAdapter } from '@forinda/kickjs-ws'
import { QueueAdapter } from '@forinda/kickjs-queue'
import { KickCronAdapter } from '@forinda/kickjs'
import { env } from '@/config'

// Side-effect imports: register decorated classes
import '@/modules/messages/chat.ws-controller'
import '@/modules/queue/queue.module'

// @Cron job classes — imported so their decorators register; KickCronAdapter schedules them
import '@/modules/cron/overdue-reminders.cron'
import '@/modules/cron/token-cleanup.cron'
import '@/modules/cron/health-check.cron'
import '@/modules/cron/daily-digest.cron'
import '@/modules/cron/presence-cleanup.cron'

const redisUrl = new URL(env.REDIS_URL)

const wsAdapter = WsAdapter({
  path: '/ws',
  heartbeatInterval: 30000,
  maxPayload: 1048576,
})

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
  PrismaAdapter({ connectionString: env.DATABASE_URL }),
  wsAdapter,
  queueAdapter,
  KickCronAdapter(),
  DevToolsAdapter({ adapters: [wsAdapter, queueAdapter] }),
  SwaggerAdapter({
    info: { title: 'Vibed (Prisma Edition)', version: '1.0.0' },
  }),
]
