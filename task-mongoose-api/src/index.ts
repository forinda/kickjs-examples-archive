import 'reflect-metadata'
// Side-effect import — registers the env schema before anything resolves @Value / ConfigService.
import '@/config'
import express from 'express'
import {
  bootstrap,
  cors,
  expressRuntime,
  getEnv,
  helmet,
  requestId,
  requestLogger,
} from '@forinda/kickjs'
import { modules } from '@/modules'
import { adapters } from '@/config/adapters'
import { isDevOrTest } from '@/config/dev-default'
import { MailerPlugin } from '@/plugins/mailer.plugin'

export const app = await bootstrap({
  modules,
  runtime: expressRuntime(),
  apiPrefix: '/api',
  defaultVersion: 1,
  // Orchestrators call /health/live and /health/ready without credentials.
  health: { flags: ['auth.public'] },
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
      // Console mail only under development/test; an unset NODE_ENV sends for real.
      provider: isDevOrTest() ? 'console' : 'resend',
      resendApiKey: getEnv('RESEND_API_KEY'),
      defaultFrom: { name: getEnv('MAIL_FROM_NAME'), address: getEnv('MAIL_FROM_EMAIL') },
    }),
  ],
})
