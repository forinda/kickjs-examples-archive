import { getEnv, type KickPlugin } from '@forinda/kickjs'
import { MailerPlugin } from '@/plugins/mailer.plugin'

export const plugins: KickPlugin[] = [
  MailerPlugin({
    smtpUrl: getEnv('SMTP_URL') || undefined,
    defaultFrom: { name: getEnv('MAIL_FROM_NAME'), address: getEnv('MAIL_FROM_EMAIL') },
  }),
]
