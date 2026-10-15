import 'reflect-metadata'
// Side-effect import — registers the env schema before anything resolves @Value / ConfigService.
import { env } from './config'
import express from 'express'
import { bootstrap, cors, expressRuntime, helmet, requestId, requestLogger } from '@forinda/kickjs'
import { modules } from './modules'
import { adapters } from './config/adapters'
import { MailerPlugin } from './plugins/mailer.plugin'

export const app = await bootstrap({
  modules,
  runtime: expressRuntime(),
  apiPrefix: '/api',
  defaultVersion: 1,
  middlewares: [
    helmet(),
    cors(),
    requestId(),
    requestLogger(),
    express.json({ limit: '5mb' }),
    express.urlencoded({ extended: true }),
  ],
  adapters,
  plugins: [
    MailerPlugin({
      provider: env.NODE_ENV === 'production' ? 'resend' : 'console',
      resendApiKey: env.RESEND_API_KEY,
      defaultFrom: { name: env.MAIL_FROM_NAME, address: env.MAIL_FROM_EMAIL },
    }),
  ],
})
