import { createToken } from '@forinda/kickjs'
import type { PrismaClient, User, WorkspaceMember } from '@/generated/prisma/client'

export type { WorkspaceMember }
export type NewWorkspaceMember = {
  workspaceId: string
  userId: string
  role?: any
}

export function createWorkspaceMemberRepository(prisma: PrismaClient) {
  return {
    async findByWorkspaceAndUser(workspaceId: string, userId: string) {
      return prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
      })
    },

    async listByWorkspace(workspaceId: string) {
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId },
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
      return prisma.workspaceMember.findMany({ where: { userId } })
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
