/// <reference types="@forinda/kickjs-vite/globals" />
import 'reflect-metadata'
// Side-effect import — registers the env schema before bootstrap().
import './config'
import {
  bootstrap,
  Container,
  cors,
  expressRuntime,
  helmet,
  requestId,
  requestLogger,
  type AppAdapter,
} from '@forinda/kickjs'
import express from 'express'
import { MailAdapter } from './adapters/mail.adapter'
import { MarketingMail, TransactionalMail } from './adapters/mail.settings'
import { AppSettings } from './config/app.settings'
import { APPLICATION } from './modules/config-reports/config-report.controller'
import { modules } from './modules'

const adapters: AppAdapter[] = [
  // One adapter, two SMTP accounts: TRANSACTIONAL_MAIL_* and MARKETING_MAIL_*.
  MailAdapter.scoped('transactional', { settings: TransactionalMail }),
  MailAdapter.scoped('marketing', { settings: MarketingMail }),
]

// /_debug — the Config tab lists where every declared variable's value came from.
// `kick dev` only: the build sets __KICKJS_DEVTOOLS__ to false and drops this
// branch, so the package is not in the production bundle.
if (__KICKJS_DEVTOOLS__) {
  const { DevToolsAdapter } = await import('@forinda/kickjs-devtools')
  adapters.push(
    DevToolsAdapter({
      exposeConfig: true,
      configPrefixes: ['APP_', 'FEATURES_', 'NODE_ENV', 'PORT'],
    }),
  )
}

// Export the app for the Vite plugin (dev mode)
export const app = await bootstrap({
  modules,
  runtime: expressRuntime(),
  middlewares: [helmet(), cors({ origin: '*' }), requestId(), requestLogger(), express.json()],
  // App-wide section. FEATURES_* is declared by FeaturesModule, the two mail
  // sections by the two MailAdapter instances.
  settings: [AppSettings],
  adapters,
})

Container.getInstance().registerInstance(APPLICATION, app)
