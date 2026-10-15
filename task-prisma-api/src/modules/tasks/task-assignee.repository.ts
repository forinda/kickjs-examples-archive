import { createToken } from '@forinda/kickjs'
import type { PrismaClient } from '@/generated/prisma/client'
import type { TaskAssignee } from '@/generated/prisma/client'

export type { TaskAssignee }

export function createTaskAssigneeRepository(prisma: PrismaClient) {
  return {
    async findByTask(taskId: string) {
      return prisma.taskAssignee.findMany({ where: { taskId } })
    },

    async add(taskId: string, userId: string) {
      return prisma.taskAssignee.create({ data: { taskId, userId } })
    },

    async addMany(taskId: string, userIds: string[]) {
      if (userIds.length === 0) return
      await prisma.taskAssignee.createMany({
        data: userIds.map((userId) => ({ taskId, userId })),
      })
    },

    async remove(taskId: string, userId: string) {
      await prisma.taskAssignee.delete({
        where: { taskId_userId: { taskId, userId } },
      })
    },

    async removeAllForTask(taskId: string) {
      await prisma.taskAssignee.deleteMany({ where: { taskId } })
    },
  }
}

export type TaskAssigneeRepository = ReturnType<typeof createTaskAssigneeRepository>

export const TASK_ASSIGNEE_REPOSITORY = createToken<TaskAssigneeRepository>(
  'app/TaskAssignee/repository',
)
