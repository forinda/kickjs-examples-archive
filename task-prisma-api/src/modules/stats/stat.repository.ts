import { createToken } from '@forinda/kickjs'
import type { PrismaClient } from '@/generated/prisma/client'

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

export function createStatsRepository(prisma: PrismaClient) {
  return {
    async getWorkspaceStats(workspaceId: string) {
      const [memberCount, projectCount, taskCount, openTasks, completedTasks, channelCount] =
        await Promise.all([
          prisma.workspaceMember.count({ where: { workspaceId, status: 'accepted' } }),
          prisma.project.count({ where: { workspaceId } }),
          prisma.task.count({ where: { workspaceId } }),
          prisma.task.count({ where: { workspaceId, status: { not: 'done' } } }),
          prisma.task.count({ where: { workspaceId, status: 'done' } }),
          prisma.channel.count({ where: { workspaceId } }),
        ])

      return {
        memberCount,
        projectCount,
        taskCount,
        openTasks,
        completedTasks,
        channelCount,
      }
    },

    async getProjectStats(projectId: string) {
      const [taskCount, statusGroups, commentSum, attachmentSum] = await Promise.all([
        prisma.task.count({ where: { projectId } }),
        prisma.task.groupBy({
          by: ['status'],
          where: { projectId },
          _count: { _all: true },
        }),
        prisma.task.aggregate({
          where: { projectId },
          _sum: { commentCount: true },
        }),
        prisma.task.aggregate({
          where: { projectId },
          _sum: { attachmentCount: true },
        }),
      ])

      const tasksByStatus: Record<string, number> = {}
      let completedCount = 0
      for (const row of statusGroups) {
        tasksByStatus[row.status] = row._count._all
        if (row.status === 'done') completedCount = row._count._all
      }

      return {
        taskCount,
        tasksByStatus,
        completionPercent: taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0,
        commentCount: commentSum._sum.commentCount ?? 0,
        attachmentCount: attachmentSum._sum.attachmentCount ?? 0,
      }
    },
  }
}

export type StatsRepository = ReturnType<typeof createStatsRepository>

export const STATS_REPOSITORY = createToken<StatsRepository>('app/Stats/repository')
