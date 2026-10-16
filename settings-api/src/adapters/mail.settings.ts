import { defineSettings } from '@forinda/kickjs'
import { z } from 'zod'
import { devDefault } from '@/config/dev-default'

/**
 * One SMTP account. Never declared on its own: each MailAdapter instance
 * declares a scoped copy, so two accounts read two sets of variables.
 */
export const MailSettings = defineSettings(
  'MAIL',
  z.object({
    host: z.string().default('localhost').describe('SMTP host'),
    port: z.coerce.number().int().positive().default(1025),
    user: z.string().default('').describe('SMTP user'),
    password: devDefault(z.string().min(8), 'dev-mail-password').describe(
      'SMTP password — or <NAME>_FILE pointing at a mounted secret',
    ),
    from: devDefault(z.email(), 'dev@example.com').describe('Sender address'),
  }),
)

/** TRANSACTIONAL_MAIL_HOST, TRANSACTIONAL_MAIL_PASSWORD, … */
export const TransactionalMail = MailSettings.scoped('TRANSACTIONAL')
/** MARKETING_MAIL_HOST, MARKETING_MAIL_PASSWORD, … */
export const MarketingMail = MailSettings.scoped('MARKETING')

export type MailConfig = ReturnType<typeof MailSettings.get>
