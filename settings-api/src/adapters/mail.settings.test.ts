import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTestApp } from '@forinda/kickjs-testing'

const saved = { ...process.env }

/**
 * The sections choose their dev defaults when they are defined, so each case
 * loads them afresh under the NODE_ENV it sets.
 */
async function bootWith(env: Record<string, string | undefined>) {
  vi.resetModules()
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  const { MailAdapter } = await import('./mail.adapter')
  const { TransactionalMail } = await import('./mail.settings')
  const { AppSettings } = await import('@/config/app.settings')
  return createTestApp({
    modules: [],
    settings: [AppSettings],
    adapters: [MailAdapter.scoped('transactional', { settings: TransactionalMail })],
  })
}

afterEach(() => {
  process.env = { ...saved }
})

describe('mail settings', () => {
  it('refuses to boot in production without the SMTP password, naming the variable', async () => {
    await expect(
      bootWith({
        NODE_ENV: 'production',
        APP_PUBLIC_URL: 'https://api.example.com',
        TRANSACTIONAL_MAIL_FROM: 'noreply@example.com',
      }),
    ).rejects.toThrow(/Settings 'TRANSACTIONAL_MAIL' are invalid[\s\S]*TRANSACTIONAL_MAIL_PASSWORD/)
  })

  it('fails closed with NODE_ENV unset — no dev default for the secret', async () => {
    await expect(
      bootWith({
        NODE_ENV: undefined,
        APP_PUBLIC_URL: 'https://api.example.com',
        TRANSACTIONAL_MAIL_FROM: 'noreply@example.com',
      }),
    ).rejects.toThrow(/Settings 'TRANSACTIONAL_MAIL' are invalid[\s\S]*TRANSACTIONAL_MAIL_PASSWORD/)
  })

  it('boots in production once the password comes from a _FILE secret', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'secret-')), 'smtp_password')
    writeFileSync(file, 'from-a-mounted-secret\n')

    const { app } = await bootWith({
      NODE_ENV: 'production',
      APP_PUBLIC_URL: 'https://api.example.com',
      TRANSACTIONAL_MAIL_FROM: 'noreply@example.com',
      TRANSACTIONAL_MAIL_PASSWORD_FILE: file,
    })
    const { TransactionalMail } = await import('./mail.settings')

    // The trailing newline is dropped; the value never lands in process.env.
    expect(TransactionalMail.get().password).toBe('from-a-mounted-secret')
    expect(process.env.TRANSACTIONAL_MAIL_PASSWORD).toBeUndefined()
    const section = app.configOrigins().sections.find((s) => s.prefix === 'TRANSACTIONAL_MAIL')
    expect(section?.vars).toContainEqual({ name: 'TRANSACTIONAL_MAIL_PASSWORD', origin: 'file' })
  })

  it('falls back to dev defaults outside production', async () => {
    await bootWith({ NODE_ENV: 'test' })
    const { TransactionalMail } = await import('./mail.settings')
    expect(TransactionalMail.get()).toMatchObject({ port: 1025, password: 'dev-mail-password' })
  })
})
