import { createToken } from '@forinda/kickjs'
import { HttpException } from '@forinda/kickjs'
import type { PrismaClient } from '@/generated/prisma/client'
import type { ParsedQuery } from '@forinda/kickjs'
import { queryAdapter } from '@/shared/infrastructure/query-adapter'
import type { Label } from '@/generated/prisma/client'

export type { Label }
export type NewLabel = {
  workspaceId: string
  name: string
  color: string
}

export function createLabelRepository(prisma: PrismaClient) {
  return {
    async findById(id: string) {
      return prisma.label.findUnique({ where: { id } })
    },

    async findByWorkspace(workspaceId: string) {
      return prisma.label.findMany({
        where: { workspaceId },
        orderBy: { name: 'asc' },
      })
    },

    async findPaginated(parsed: ParsedQuery, workspaceId?: string) {
      const query = queryAdapter.build(parsed, { searchColumns: ['name'] })
      const where = workspaceId
        ? query.where
          ? { AND: [query.where, { workspaceId }] }
          : { workspaceId }
        : query.where

      const [data, total] = await Promise.all([
        prisma.label.findMany({
          where,
          orderBy: query.orderBy,
          skip: query.skip,
          take: query.take,
        }),
        prisma.label.count({ where }),
      ])

      return { data, total }
    },

    async create(data: NewLabel) {
      return prisma.label.create({ data: data as any })
    },

    async update(id: string, data: Partial<NewLabel>) {
      const label = await prisma.label
        .update({ where: { id }, data: data as any })
        .catch(() => null)
      if (!label) throw HttpException.notFound('Label not found')
      return label
    },

    async delete(id: string) {
      await prisma.label.delete({ where: { id } })
    },
  }
}

export type LabelRepository = ReturnType<typeof createLabelRepository>

export const LABEL_REPOSITORY = createToken<LabelRepository>('app/Label/repository')
