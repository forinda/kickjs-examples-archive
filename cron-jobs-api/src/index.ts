/// <reference types="@forinda/kickjs-vite/globals" />
import 'reflect-metadata'
// Side-effect import — registers the env schema before anything reads it.
import './config'
import {
  bootstrap,
  expressRuntime,
  getEnv,
  KickCronAdapter,
  type AppAdapter,
} from '@forinda/kickjs'
import { CronErrorsAdapter } from './adapters/cron-errors.adapter'
import { modules } from './modules'

const adapters: AppAdapter[] = [
  // Schedules every @Cron job with croner (Node server only; stops them on shutdown
  // and waits for running ones). On serverless, the platform calls /_kick/cron instead.
  KickCronAdapter({ enabled: getEnv('CRON_ENABLED') }),
  CronErrorsAdapter(),
]

// DevTools (/_debug) in `kick dev` only: the build sets __KICKJS_DEVTOOLS__ to false and
// drops this branch, so the package is not in the production bundle.
if (__KICKJS_DEVTOOLS__) {
  const { DevToolsAdapter } = await import('@forinda/kickjs-devtools')
  adapters.push(DevToolsAdapter())
}

export const app = await bootstrap({
  modules,
  runtime: expressRuntime(),
  adapters,
})
