import { createToken } from '@forinda/kickjs'
import { and, eq } from 'drizzle-orm'
import type { AppDatabase } from '@/db'
import { labels, taskLabels } from '@/db/schema'

export type TaskLabel = typeof taskLabels.$inferSelect
export type Label = typeof labels.$inferSelect

export function createTaskLabelRepository(db: AppDatabase) {
  return {
    async findByTask(taskId: string): Promise<Label[]> {
      const rows = await db
        .select({ label: labels })
        .from(taskLabels)
        .innerJoin(labels, eq(taskLabels.labelId, labels.id))
        .where(eq(taskLabels.taskId, taskId))
      return rows.map((r) => r.label)
    },

    async add(taskId: string, labelId: string): Promise<TaskLabel> {
      const [row] = await db.insert(taskLabels).values({ taskId, labelId }).returning()
      return row
    },

    async remove(taskId: string, labelId: string): Promise<void> {
      await db
        .delete(taskLabels)
        .where(and(eq(taskLabels.taskId, taskId), eq(taskLabels.labelId, labelId)))
    },

    async removeAllForTask(taskId: string): Promise<void> {
      await db.delete(taskLabels).where(eq(taskLabels.taskId, taskId))
    },
  }
}

export type TaskLabelRepository = ReturnType<typeof createTaskLabelRepository>

export const TASK_LABEL_REPOSITORY = createToken<TaskLabelRepository>('app/TaskLabel/repository')
