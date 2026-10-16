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
} from '@forinda/kickjs'
import { DevToolsAdapter } from '@forinda/kickjs-devtools'
import express from 'express'
import { MailAdapter } from './adapters/mail.adapter'
import { MarketingMail, TransactionalMail } from './adapters/mail.settings'
import { AppSettings } from './config/app.settings'
import { isDevOrTest } from './config/dev-default'
import { APPLICATION } from './modules/config-reports/config-report.controller'
import { modules } from './modules'

// Export the app for the Vite plugin (dev mode)
export const app = await bootstrap({
  modules,
  runtime: expressRuntime(),
  middlewares: [helmet(), cors({ origin: '*' }), requestId(), requestLogger(), express.json()],
  // App-wide section. FEATURES_* is declared by FeaturesModule, the two mail
  // sections by the two MailAdapter instances.
  settings: [AppSettings],
  adapters: [
    // One adapter, two SMTP accounts: TRANSACTIONAL_MAIL_* and MARKETING_MAIL_*.
    MailAdapter.scoped('transactional', { settings: TransactionalMail }),
    MailAdapter.scoped('marketing', { settings: MarketingMail }),
    // /_debug — the Config tab lists where every declared variable's value came from.
    DevToolsAdapter({
      // Its own default is `NODE_ENV !== 'production'`, which turns /_debug on
      // when NODE_ENV is unset. Fail closed instead.
      enabled: isDevOrTest(),
      exposeConfig: true,
      configPrefixes: ['APP_', 'FEATURES_', 'NODE_ENV', 'PORT'],
    }),
  ],
})

Container.getInstance().registerInstance(APPLICATION, app)
