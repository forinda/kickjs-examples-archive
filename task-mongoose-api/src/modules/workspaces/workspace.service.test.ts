import 'reflect-metadata'
import { describe, it, expect, vi } from 'vitest'
import { WorkspacesService } from './workspace.service'

// Invites must not reveal which emails have an account: every case resolves the same way.
function makeService() {
  const users: Record<string, { _id: string; email: string }> = {
    'member@test.com': { _id: 'u1', email: 'member@test.com' },
    'known@test.com': { _id: 'u2', email: 'known@test.com' },
  }
  const memberRepo = {
    findAnyByUserAndWorkspace: async (userId: string) =>
      userId === 'u1' ? { role: 'member' } : null,
    create: vi.fn(async (data: unknown) => data),
  }
  const jobs = { dispatch: vi.fn(async () => undefined) }
  const service = new WorkspacesService(
    { findById: async () => ({ name: 'Acme' }) } as never,
    memberRepo as never,
    { findByEmail: async (email: string) => users[email] ?? null } as never,
    jobs as never,
  )
  return { service, memberRepo, jobs }
}

describe('WorkspacesService.inviteMember', () => {
  it.each(['nobody@test.com', 'member@test.com', 'known@test.com'])(
    'resolves to nothing for %s',
    async (email) => {
      const { service } = makeService()
      await expect(service.inviteMember('ws1', { email, role: 'member' })).resolves.toBeUndefined()
    },
  )

  it('records a pending invite for, and emails, only an existing non-member', async () => {
    const { service, memberRepo, jobs } = makeService()
    await service.inviteMember('ws1', { email: 'nobody@test.com', role: 'member' })
    await service.inviteMember('ws1', { email: 'member@test.com', role: 'member' })
    expect(memberRepo.create).not.toHaveBeenCalled()
    await service.inviteMember('ws1', { email: 'known@test.com', role: 'member' })
    expect(memberRepo.create).toHaveBeenCalledOnce()
    expect(memberRepo.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }))
    expect(jobs.dispatch).toHaveBeenCalledOnce()
  })
})
