import { createToken } from '@forinda/kickjs'
import { HttpException } from '@forinda/kickjs'
import type { PrismaClient } from '@/generated/prisma/client'
import type { ParsedQuery } from '@forinda/kickjs'
import { queryAdapter } from '@/shared/query-adapter'
import { TASK_QUERY_CONFIG } from './task.constants'
import type { Task } from '@/generated/prisma/client'

export type { Task }
export type NewTask = {
  projectId: string
  workspaceId: string
  key: string
  title: string
  description?: string | null
  status?: string
  priority?: any
  reporterId: string
  parentTaskId?: string | null
  dueDate?: Date | null
  estimatePoints?: number | null
  orderIndex?: number
}

export function createTaskRepository(prisma: PrismaClient) {
  return {
    async findById(id: string) {
      return prisma.task.findUnique({ where: { id } })
    },

    async findByProject(projectId: string) {
      return prisma.task.findMany({
        where: { projectId },
        orderBy: { orderIndex: 'asc' },
      })
    },

    async findPaginated(parsed: ParsedQuery, projectId?: string) {
      const query = queryAdapter.build(parsed, TASK_QUERY_CONFIG)
      const where = projectId
        ? query.where
          ? { AND: [query.where, { projectId }] }
          : { projectId }
        : query.where

      const [data, total] = await Promise.all([
        prisma.task.findMany({
          where,
          orderBy: query.orderBy,
          skip: query.skip,
          take: query.take,
        }),
        prisma.task.count({ where }),
      ])

      return { data, total }
    },

    async findSubtasks(parentTaskId: string) {
      return prisma.task.findMany({
        where: { parentTaskId },
        orderBy: { orderIndex: 'asc' },
      })
    },

    async create(dto: NewTask) {
      return prisma.task.create({ data: dto as any })
    },

    async update(id: string, dto: Partial<NewTask>) {
      const task = await prisma.task.update({ where: { id }, data: dto as any }).catch(() => null)
      if (!task) throw HttpException.notFound('Task not found')
      return task
    },

    async delete(id: string) {
      await prisma.task.delete({ where: { id } })
    },
  }
}

export type TaskRepository = ReturnType<typeof createTaskRepository>

export const TASK_REPOSITORY = createToken<TaskRepository>('app/Task/repository')
