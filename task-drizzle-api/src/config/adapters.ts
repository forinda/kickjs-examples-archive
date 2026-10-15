import { DevToolsAdapter } from '@forinda/kickjs-devtools'
import { SwaggerAdapter } from '@forinda/kickjs-swagger'
import { WsAdapter } from '@forinda/kickjs-ws'
import { QueueAdapter } from '@forinda/kickjs-queue'
import { KickCronAdapter, type AppAdapter } from '@forinda/kickjs'
import { DrizzleAdapter } from '@/db'
import { env } from './env'

// Side-effect imports: register decorated classes
import '@/modules/messages/presentation/chat.ws-controller'
import '@/modules/queue/queue.module'

// Cron job classes — imported so their @Cron methods register with KickCronAdapter
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

export const adapters: AppAdapter[] = [
  DrizzleAdapter({ url: env.DATABASE_URL }),
  wsAdapter,
  queueAdapter,
  KickCronAdapter(),
  DevToolsAdapter({ adapters: [wsAdapter, queueAdapter] }),
  SwaggerAdapter({
    info: { title: 'Vibed (Drizzle Edition)', version: '1.0.0' },
  }),
]
