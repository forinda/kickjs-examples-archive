import { createToken } from '@forinda/kickjs'
import { eq, sql } from 'drizzle-orm'
import type { AppDatabase } from '@/db'
import { attachments, channels, comments, projects, tasks, workspaceMembers } from '@/db/schema'

export interface WorkspaceStats {
  memberCount: number
  projectCount: number
  taskCount: number
  openTasks: number
  completedTasks: number
  channelCount: number
}

export interface ProjectStats {
  taskCount: number
  tasksByStatus: Record<string, number>
  completionPercent: number
  commentCount: number
  attachmentCount: number
}

export function createStatsRepository(db: AppDatabase) {
  return {
    async getWorkspaceStats(workspaceId: string): Promise<WorkspaceStats> {
      const [memberResult, projectResult, taskResult, openResult, completedResult, channelResult] =
        await Promise.all([
          db
            .select({ count: sql<number>`count(*)` })
            .from(workspaceMembers)
            .where(eq(workspaceMembers.workspaceId, workspaceId)),
          db
            .select({ count: sql<number>`count(*)` })
            .from(projects)
            .where(eq(projects.workspaceId, workspaceId)),
          db
            .select({ count: sql<number>`count(*)` })
            .from(tasks)
            .where(eq(tasks.workspaceId, workspaceId)),
          db
            .select({ count: sql<number>`count(*)` })
            .from(tasks)
            .where(sql`${tasks.workspaceId} = ${workspaceId} AND ${tasks.status} != 'done'`),
          db
            .select({ count: sql<number>`count(*)` })
            .from(tasks)
            .where(sql`${tasks.workspaceId} = ${workspaceId} AND ${tasks.status} = 'done'`),
          db
            .select({ count: sql<number>`count(*)` })
            .from(channels)
            .where(eq(channels.workspaceId, workspaceId)),
        ])

      return {
        memberCount: memberResult[0]?.count ?? 0,
        projectCount: projectResult[0]?.count ?? 0,
        taskCount: taskResult[0]?.count ?? 0,
        openTasks: openResult[0]?.count ?? 0,
        completedTasks: completedResult[0]?.count ?? 0,
        channelCount: channelResult[0]?.count ?? 0,
      }
    },

    async getProjectStats(projectId: string): Promise<ProjectStats> {
      const [taskResult, statusResult, commentResult, attachmentResult] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(tasks)
          .where(eq(tasks.projectId, projectId)),
        db
          .select({
            status: tasks.status,
            count: sql<number>`count(*)`,
          })
          .from(tasks)
          .where(eq(tasks.projectId, projectId))
          .groupBy(tasks.status),
        db
          .select({ total: sql<number>`sum(${tasks.commentCount})` })
          .from(tasks)
          .where(eq(tasks.projectId, projectId)),
        db
          .select({ total: sql<number>`sum(${tasks.attachmentCount})` })
          .from(tasks)
          .where(eq(tasks.projectId, projectId)),
      ])

      const taskCount = taskResult[0]?.count ?? 0
      const tasksByStatus: Record<string, number> = {}
      let completedCount = 0
      for (const row of statusResult) {
        tasksByStatus[row.status] = row.count
        if (row.status === 'done') completedCount = row.count
      }

      return {
        taskCount,
        tasksByStatus,
        completionPercent: taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0,
        commentCount: commentResult[0]?.total ?? 0,
        attachmentCount: attachmentResult[0]?.total ?? 0,
      }
    },
  }
}

export type StatsRepository = ReturnType<typeof createStatsRepository>

export const STATS_REPOSITORY = createToken<StatsRepository>('app/Stats/repository')
