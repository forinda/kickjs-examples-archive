import { createToken } from '@forinda/kickjs'
import type { PrismaClient, Label } from '@/generated/prisma/client'
import type { TaskLabel } from '@/generated/prisma/client'

export type { TaskLabel, Label }

export function createTaskLabelRepository(prisma: PrismaClient) {
  return {
    async findByTask(taskId: string) {
      const rows = await prisma.taskLabel.findMany({
        where: { taskId },
        include: { label: true },
      })
      return rows.map((r) => (r as { label: Label }).label)
    },

    async add(taskId: string, labelId: string) {
      return prisma.taskLabel.create({ data: { taskId, labelId } })
    },

    async remove(taskId: string, labelId: string) {
      await prisma.taskLabel.delete({
        where: { taskId_labelId: { taskId, labelId } },
      })
    },

    async removeAllForTask(taskId: string) {
      await prisma.taskLabel.deleteMany({ where: { taskId } })
    },
  }
}

export type TaskLabelRepository = ReturnType<typeof createTaskLabelRepository>

export const TASK_LABEL_REPOSITORY = createToken<TaskLabelRepository>('app/TaskLabel/repository')
