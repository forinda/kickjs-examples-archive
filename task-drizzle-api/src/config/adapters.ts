/// <reference types="@forinda/kickjs-vite/globals" />
import { WsAdapter } from '@forinda/kickjs-ws'
import { QueueAdapter } from '@forinda/kickjs-queue'
import { getEnv, KickCronAdapter, type AppAdapter } from '@forinda/kickjs'
import { DrizzleAdapter } from '@/adapters/drizzle.adapter'
import { swaggerAdapters } from './swagger'

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
  // OpenAPI spec + UI under development/test only.
  ...swaggerAdapters(),
]

// DevTools (/_debug) in `kick dev` only: the vite plugin sets the flag false for
// `kick build`, so the import and the package drop out of the production bundle.
if (__KICKJS_DEVTOOLS__) {
  const { DevToolsAdapter } = await import('@forinda/kickjs-devtools')
  adapters.push(DevToolsAdapter({ adapters: [wsAdapter, queueAdapter] }))
}
