import { createToken } from '@forinda/kickjs'
import type { PrismaClient, User, WorkspaceMember } from '@/generated/prisma/client'

export type { WorkspaceMember }
export type NewWorkspaceMember = {
  workspaceId: string
  userId: string
  role?: any
  status?: 'pending' | 'accepted'
}

/** Accepted memberships only — a pending invite grants nothing. Every membership read uses it. */
export const ACCEPTED = { status: 'accepted' } as const

export function createWorkspaceMemberRepository(prisma: PrismaClient) {
  const pendingInvite = (workspaceId: string, userId: string) => ({
    workspaceId,
    userId,
    status: 'pending' as const,
  })

  return {
    async findByWorkspaceAndUser(workspaceId: string, userId: string) {
      return prisma.workspaceMember.findFirst({ where: { workspaceId, userId, ...ACCEPTED } })
    },

    /** The membership or pending invite, whichever exists — for invite de-duplication only. */
    async findAnyByWorkspaceAndUser(workspaceId: string, userId: string) {
      return prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
      })
    },

    /** `userId`'s pending invites, with the workspace name so they know what they're joining. */
    async listInvitesForUser(userId: string) {
      const rows = await prisma.workspaceMember.findMany({
        where: { userId, status: 'pending' },
        select: { role: true, joinedAt: true, workspace: { select: { id: true, name: true } } },
      })
      return rows.map((r) => ({
        workspaceId: r.workspace.id,
        workspaceName: r.workspace.name,
        role: r.role,
        invitedAt: r.joinedAt,
      }))
    },

    /** Turns `userId`'s pending invite into a membership. False when there is no such invite. */
    async acceptInvite(workspaceId: string, userId: string): Promise<boolean> {
      const { count } = await prisma.workspaceMember.updateMany({
        where: pendingInvite(workspaceId, userId),
        data: { status: 'accepted', joinedAt: new Date() },
      })
      return count > 0
    },

    /** Drops `userId`'s pending invite. False when there is no such invite. */
    async declineInvite(workspaceId: string, userId: string): Promise<boolean> {
      const { count } = await prisma.workspaceMember.deleteMany({
        where: pendingInvite(workspaceId, userId),
      })
      return count > 0
    },

    async listByWorkspace(workspaceId: string) {
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId, ...ACCEPTED },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      })
      return members.map(({ user, ...member }) => ({
        member: member as WorkspaceMember,
        user: user as User,
      }))
    },

    async listByUser(userId: string) {
      return prisma.workspaceMember.findMany({ where: { userId, ...ACCEPTED } })
    },

    async add(data: NewWorkspaceMember) {
      return prisma.workspaceMember.create({ data })
    },

    async updateRole(workspaceId: string, userId: string, role: string) {
      return prisma.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId, userId } },
        data: { role: role as any },
      })
    },

    async remove(workspaceId: string, userId: string) {
      await prisma.workspaceMember.delete({
        where: { workspaceId_userId: { workspaceId, userId } },
      })
    },
  }
}

export type WorkspaceMemberRepository = ReturnType<typeof createWorkspaceMemberRepository>

export const WORKSPACE_MEMBER_REPOSITORY = createToken<WorkspaceMemberRepository>(
  'app/WorkspaceMember/repository',
)
