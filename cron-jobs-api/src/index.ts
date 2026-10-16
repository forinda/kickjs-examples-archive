import 'reflect-metadata'
import { env } from './config'
import { bootstrap, expressRuntime, KickCronAdapter } from '@forinda/kickjs'
import { CronErrorsAdapter } from './adapters/cron-errors.adapter'
import { modules } from './modules'

export const app = await bootstrap({
  modules,
  runtime: expressRuntime(),
  adapters: [
    // Schedules every @Cron job with croner (Node server only; stops them on shutdown
    // and waits for running ones). On serverless, the platform calls /_kick/cron instead.
    KickCronAdapter({ enabled: env.CRON_ENABLED }),
    CronErrorsAdapter(),
  ],
})
