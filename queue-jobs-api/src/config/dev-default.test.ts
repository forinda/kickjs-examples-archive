import { afterEach, describe, expect, it, vi } from 'vitest'
import { isDevOrTest } from './dev-default'

const original = process.env.NODE_ENV
afterEach(() => {
  if (original === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV')
  else process.env.NODE_ENV = original
  vi.resetModules()
})

describe('isDevOrTest', () => {
  it('is true only for development and test', () => {
    for (const env of ['development', 'test']) {
      process.env.NODE_ENV = env
      expect(isDevOrTest()).toBe(true)
    }
    process.env.NODE_ENV = 'production'
    expect(isDevOrTest()).toBe(false)
  })

  it('fails closed when NODE_ENV is unset: the env schema requires REDIS_PASSWORD', async () => {
    Reflect.deleteProperty(process.env, 'NODE_ENV') // typed as required by KickEnv
    Reflect.deleteProperty(process.env, 'REDIS_PASSWORD')
    vi.resetModules()
    await expect(import('./index')).rejects.toThrow(/REDIS_PASSWORD/)
  })
})
