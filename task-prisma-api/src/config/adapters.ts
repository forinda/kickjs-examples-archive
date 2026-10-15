import { PrismaAdapter } from '@/db/prisma'
import { DevToolsAdapter } from '@forinda/kickjs-devtools'
import { SwaggerAdapter } from '@forinda/kickjs-swagger'
import { WsAdapter } from '@forinda/kickjs-ws'
import { QueueAdapter } from '@forinda/kickjs-queue'
import { KickCronAdapter } from '@forinda/kickjs'
import { env } from '@/config'

// Side-effect imports: register decorated classes
import '@/modules/messages/presentation/chat.ws-controller'
import '@/modules/queue/queue.module'

// @Cron job classes — imported so their decorators register; KickCronAdapter schedules them
import '@/modules/cron/infrastructure/jobs/overdue-reminders.cron'
import '@/modules/cron/infrastructure/jobs/token-cleanup.cron'
import '@/modules/cron/infrastructure/jobs/health-check.cron'
import '@/modules/cron/infrastructure/jobs/daily-digest.cron'
import '@/modules/cron/infrastructure/jobs/presence-cleanup.cron'

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
