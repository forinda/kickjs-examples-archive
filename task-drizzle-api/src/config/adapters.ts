import { DevToolsAdapter } from '@forinda/kickjs-devtools'
import { SwaggerAdapter } from '@forinda/kickjs-swagger'
import { WsAdapter } from '@forinda/kickjs-ws'
import { QueueAdapter } from '@forinda/kickjs-queue'
import { getEnv, KickCronAdapter, type AppAdapter } from '@forinda/kickjs'
import { DrizzleAdapter } from '@/adapters/drizzle.adapter'
import { isDevOrTest } from './dev-default'

// Side-effect imports: register decorated classes
import '@/modules/messages/chat.ws-controller'
import '@/modules/queues/queue.module'

// Cron job classes — imported so their @Cron methods register with KickCronAdapter
import '@/modules/crons/overdue-reminders.cron'
import '@/modules/crons/token-cleanup.cron'
import '@/modules/crons/health-check.cron'
import '@/modules/crons/daily-digest.cron'
import '@/modules/crons/presence-cleanup.cron'

const redisUrl = new URL(getEnv('REDIS_URL'))

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
  DrizzleAdapter({ url: getEnv('DATABASE_URL') }),
  wsAdapter,
  queueAdapter,
  KickCronAdapter(),
  // Its own default turns /_debug on when NODE_ENV is unset; fail closed instead.
  DevToolsAdapter({ enabled: isDevOrTest(), adapters: [wsAdapter, queueAdapter] }),
  SwaggerAdapter({
    info: { title: 'Vibed (Drizzle Edition)', version: '1.0.0' },
  }),
]
