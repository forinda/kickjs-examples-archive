import { createToken } from '@forinda/kickjs'
import { HttpException } from '@forinda/kickjs'
import type { PrismaClient } from '@/generated/prisma/client'
import type { ParsedQuery } from '@forinda/kickjs'
import { queryAdapter } from '@/shared/query-adapter'
import type { Project } from '@/generated/prisma/client'

export type { Project }
export type NewProject = {
  workspaceId: string
  name: string
  key: string
  description?: string | null
  leadId?: string | null
}

export function createProjectRepository(prisma: PrismaClient) {
  return {
    async findById(id: string) {
      return prisma.project.findUnique({ where: { id } })
    },

    async findByWorkspace(workspaceId: string) {
      return prisma.project.findMany({ where: { workspaceId } })
    },

    async findPaginated(parsed: ParsedQuery, workspaceId?: string) {
      const query = queryAdapter.build(parsed, { searchColumns: ['name', 'key'] })
      const where = workspaceId
        ? query.where
          ? { AND: [query.where, { workspaceId }] }
          : { workspaceId }
        : query.where

      const [data, total] = await Promise.all([
        prisma.project.findMany({
          where,
          orderBy: query.orderBy,
          skip: query.skip,
          take: query.take,
        }),
        prisma.project.count({ where }),
      ])

      return { data, total }
    },

    async create(dto: NewProject) {
      return prisma.project.create({ data: dto as any })
    },

    async update(id: string, dto: Partial<NewProject>) {
      const project = await prisma.project
        .update({ where: { id }, data: dto as any })
        .catch(() => null)
      if (!project) throw HttpException.notFound('Project not found')
      return project
    },

    async incrementTaskCounter(id: string) {
      return prisma.project.update({
        where: { id },
        data: { taskCounter: { increment: 1 } },
        select: { taskCounter: true, key: true },
      })
    },

    async delete(id: string) {
      await prisma.project.delete({ where: { id } })
    },
  }
}

export type ProjectRepository = ReturnType<typeof createProjectRepository>

export const PROJECT_REPOSITORY = createToken<ProjectRepository>('app/Project/repository')
