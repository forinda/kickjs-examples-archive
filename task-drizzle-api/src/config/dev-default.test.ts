import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { devDefault, isDevOrTest } from './dev-default'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isDevOrTest', () => {
  it('is true only for development and test', () => {
    for (const env of ['development', 'test']) {
      vi.stubEnv('NODE_ENV', env)
      expect(isDevOrTest()).toBe(true)
    }
    vi.stubEnv('NODE_ENV', 'production')
    expect(isDevOrTest()).toBe(false)
  })

  it('fails closed when NODE_ENV is unset: no dev default, DevTools off', () => {
    vi.stubEnv('NODE_ENV', undefined)
    expect(isDevOrTest()).toBe(false)
    expect(devDefault(z.string(), 'redis://localhost:6379').safeParse(undefined).success).toBe(
      false,
    )
  })
})
