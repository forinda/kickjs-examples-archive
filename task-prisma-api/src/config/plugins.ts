import { MailerPlugin } from '@/plugins/mailer.plugin'
import { getEnv } from '@forinda/kickjs'

export const plugins = [
  MailerPlugin({
    smtpUrl: getEnv('SMTP_URL') || undefined,
    defaultFrom: { name: getEnv('MAIL_FROM_NAME'), address: getEnv('MAIL_FROM_EMAIL') },
  }),
]
