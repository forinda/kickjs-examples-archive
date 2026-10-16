import { createToken, type ParsedQuery } from '@forinda/kickjs'
import { and, eq, sql } from 'drizzle-orm'
import type { AppDatabase } from '@/db'
import { activities } from '@/db/schema'
import { ACTIVITY_QUERY_CONFIG } from './activity.constants'
import { queryAdapter } from '@/shared/query-adapter'

export type Activity = typeof activities.$inferSelect
export type NewActivity = typeof activities.$inferInsert

export function createActivityRepository(db: AppDatabase) {
  return {
    async findPaginated(
      parsed: ParsedQuery,
      scope: { workspaceId: string; projectId?: string; taskId?: string },
    ): Promise<{ data: Activity[]; total: number }> {
      const conditions = [eq(activities.workspaceId, scope.workspaceId)]
      if (scope.projectId) {
        conditions.push(eq(activities.projectId, scope.projectId))
      }
      if (scope.taskId) {
        conditions.push(eq(activities.taskId, scope.taskId))
      }

      const query = queryAdapter.buildFromColumns(parsed, {
        ...ACTIVITY_QUERY_CONFIG,
        baseCondition: and(...conditions),
      })

      const [data, countResult] = await Promise.all([
        db
          .select()
          .from(activities)
          .where(query.where)
          .orderBy(...query.orderBy)
          .limit(query.limit)
          .offset(query.offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(activities)
          .where(query.where),
      ])

      return { data, total: countResult[0]?.count ?? 0 }
    },

    async create(data: NewActivity): Promise<Activity> {
      const [activity] = await db.insert(activities).values(data).returning()
      return activity
    },
  }
}

export type ActivityRepository = ReturnType<typeof createActivityRepository>

export const ACTIVITY_REPOSITORY = createToken<ActivityRepository>('app/Activity/repository')
