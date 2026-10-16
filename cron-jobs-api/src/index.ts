import 'reflect-metadata'
// Side-effect import — registers the env schema before anything reads it.
import './config'
import { bootstrap, expressRuntime, getEnv, KickCronAdapter } from '@forinda/kickjs'
import { CronErrorsAdapter } from './adapters/cron-errors.adapter'
import { modules } from './modules'

export const app = await bootstrap({
  modules,
  runtime: expressRuntime(),
  adapters: [
    // Schedules every @Cron job with croner (Node server only; stops them on shutdown
    // and waits for running ones). On serverless, the platform calls /_kick/cron instead.
    KickCronAdapter({ enabled: getEnv('CRON_ENABLED') }),
    CronErrorsAdapter(),
  ],
})
