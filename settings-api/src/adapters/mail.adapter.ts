import { connect } from 'node:net'
import { defineAdapter, type Settings } from '@forinda/kickjs'
import { MailSettings, type MailConfig } from './mail.settings'

export interface MailAdapterConfig {
  /** The section this instance reads — a `MailSettings.scoped(…)` copy. */
  settings: Settings<MailConfig>
}

/** Resolves once `host:port` accepts a TCP connection, false after 1s. */
function reachable(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host, port, timeout: 1000 })
    const done = (ok: boolean) => {
      socket.destroy()
      resolve(ok)
    }
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
  })
}

/**
 * One SMTP account per instance. Mount it once per account with `.scoped()`:
 *
 *   MailAdapter.scoped('transactional', { settings: TransactionalMail })
 *
 * Each instance declares its own section, so its variables are validated at
 * startup only when the adapter is mounted, and `/health/ready` checks each
 * SMTP server separately. Sending is left out: hand `settings.get()` to the
 * SMTP client of your choice (e.g. nodemailer's `createTransport`).
 */
export const MailAdapter = defineAdapter<MailAdapterConfig>({
  name: 'MailAdapter',
  defaults: { settings: MailSettings },
  build: ({ settings }, { name }) => ({
    settings: () => [settings],
    onHealthCheck: async () => {
      const { host, port } = settings.get()
      return { name, status: (await reachable(host, port)) ? ('up' as const) : ('down' as const) }
    },
  }),
})
