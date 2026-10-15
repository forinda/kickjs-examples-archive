import { MailerPlugin } from '@/plugins/mailer.plugin'
import { env } from '@/config'

export const plugins = [
  MailerPlugin({
    smtpUrl: env.SMTP_URL,
    defaultFrom: { name: env.MAIL_FROM_NAME, address: env.MAIL_FROM_EMAIL },
  }),
]
