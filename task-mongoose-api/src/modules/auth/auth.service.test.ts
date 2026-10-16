import 'reflect-metadata'
import { describe, it, expect } from 'vitest'
import { AuthService } from './auth.service'

describe('AuthService.register', () => {
  it('answers a taken email with a generic 409, not "email exists"', async () => {
    const service = new AuthService(
      { findByEmail: async () => ({ _id: 'u1' }) } as never,
      {} as never,
      {} as never,
    )
    const err = await service
      .register({ email: 'taken@test.com', password: 'secret123', firstName: 'A', lastName: 'B' })
      .catch((e) => e)
    expect(err.status).toBe(409)
    expect(err.message).toBe('REGISTRATION_FAILED')
    expect(err.message).not.toMatch(/email|exist/i)
  })
})
