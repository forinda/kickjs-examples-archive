import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createTestApp } from '@forinda/kickjs-testing'
import { MailAdapter } from '@/adapters/mail.adapter'
import { TransactionalMail } from '@/adapters/mail.settings'
import { AppSettings } from '@/config/app.settings'
import { APPLICATION } from './config-report.controller'
import { ConfigReportModule } from './config-report.module'

describe('GET /config', () => {
  it('lists every section with its origins, and masks secret defaults', async () => {
    process.env.TRANSACTIONAL_MAIL_PORT = '2525'
    try {
      const { app, container } = await createTestApp({
        modules: [ConfigReportModule()],
        settings: [AppSettings],
        adapters: [MailAdapter.scoped('transactional', { settings: TransactionalMail })],
      })
      container.registerInstance(APPLICATION, app)

      const res = await request(app.handle.bind(app)).get('/api/v1/config').expect(200)
      const mail = res.body.sections.find(
        (s: { prefix: string }) => s.prefix === 'TRANSACTIONAL_MAIL',
      )
      expect(mail.declaredBy).toBe('adapter MailAdapter:transactional')
      const byName = Object.fromEntries(mail.vars.map((v: { name: string }) => [v.name, v]))
      expect(byName.TRANSACTIONAL_MAIL_PORT).toMatchObject({ origin: 'env', default: 1025 })
      expect(byName.TRANSACTIONAL_MAIL_PASSWORD).toMatchObject({
        origin: 'default',
        default: '********',
      })
      expect(JSON.stringify(res.body)).not.toContain('dev-mail-password')
    } finally {
      delete process.env.TRANSACTIONAL_MAIL_PORT
    }
  })
})
