import { createToken } from '@forinda/kickjs'
import { HttpException } from '@forinda/kickjs'
import type { PrismaClient, Workspace } from '@/generated/prisma/client'
import type { ParsedQuery } from '@forinda/kickjs'
import { queryAdapter } from '@/shared/query-adapter'

export type { Workspace }

export function createWorkspaceRepository(prisma: PrismaClient) {
  return {
    async findById(id: string) {
      return prisma.workspace.findUnique({ where: { id } })
    },

    async findBySlug(slug: string) {
      return prisma.workspace.findUnique({ where: { slug } })
    },

    async findForUser(userId: string) {
      const memberships = await prisma.workspaceMember.findMany({
        where: { userId, status: 'accepted' },
        include: { workspace: true },
      })
      return memberships.map((m) => (m as { workspace: Workspace }).workspace)
    },

    async findPaginated(parsed: ParsedQuery) {
      const query = queryAdapter.build(parsed, { searchable: ['name', 'slug'] })

      const [data, total] = await Promise.all([
        prisma.workspace.findMany({
          where: query.where,
          orderBy: query.orderBy,
          skip: query.skip,
          take: query.take,
        }),
        prisma.workspace.count({ where: query.where }),
      ])

      return { data, total }
    },

    async create(dto: any) {
      return prisma.workspace.create({ data: dto })
    },

    async update(id: string, dto: any) {
      const workspace = await prisma.workspace
        .update({ where: { id }, data: dto })
        .catch(() => null)
      if (!workspace) throw HttpException.notFound('Workspace not found')
      return workspace
    },

    async delete(id: string) {
      await prisma.workspace.delete({ where: { id } })
    },
  }
}

export type WorkspaceRepository = ReturnType<typeof createWorkspaceRepository>

export const WORKSPACE_REPOSITORY = createToken<WorkspaceRepository>('app/Workspace/repository')
