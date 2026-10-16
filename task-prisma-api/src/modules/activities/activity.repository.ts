import { createToken } from '@forinda/kickjs'
import type { PrismaClient } from '@/generated/prisma/client'
import type { ParsedQuery } from '@forinda/kickjs'
import { queryAdapter } from '@/shared/query-adapter'
import { ACTIVITY_QUERY_CONFIG } from './activity.constants'
import type { Activity } from '@/generated/prisma/client'

export type { Activity }
export type NewActivity = {
  workspaceId: string
  actorId: string
  action: string
  projectId?: string | null
  taskId?: string | null
  changes?: any
}

export function createActivityRepository(prisma: PrismaClient) {
  return {
    async findPaginated(
      parsed: ParsedQuery,
      scope: { workspaceId: string; projectId?: string; taskId?: string },
    ) {
      const query = queryAdapter.build(parsed, ACTIVITY_QUERY_CONFIG)
      const scopeCondition: any = { workspaceId: scope.workspaceId }
      if (scope.projectId) scopeCondition.projectId = scope.projectId
      if (scope.taskId) scopeCondition.taskId = scope.taskId

      const where = query.where ? { AND: [query.where, scopeCondition] } : scopeCondition

      const [data, total] = await Promise.all([
        prisma.activity.findMany({
          where,
          orderBy: query.orderBy,
          skip: query.skip,
          take: query.take,
        }),
        prisma.activity.count({ where }),
      ])

      return { data, total }
    },

    async create(data: NewActivity) {
      return prisma.activity.create({ data: data as any })
    },
  }
}

export type ActivityRepository = ReturnType<typeof createActivityRepository>

export const ACTIVITY_REPOSITORY = createToken<ActivityRepository>('app/Activity/repository')
