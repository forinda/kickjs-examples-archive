import { createToken } from '@forinda/kickjs'
import { and, eq } from 'drizzle-orm'
import type { AppDatabase } from '@/db'
import { taskAssignees } from '@/db/schema'

export type TaskAssignee = typeof taskAssignees.$inferSelect
export type NewTaskAssignee = typeof taskAssignees.$inferInsert

export function createTaskAssigneeRepository(db: AppDatabase) {
  return {
    async findByTask(taskId: string): Promise<TaskAssignee[]> {
      return db.select().from(taskAssignees).where(eq(taskAssignees.taskId, taskId))
    },

    async add(taskId: string, userId: string): Promise<TaskAssignee> {
      const [result] = await db.insert(taskAssignees).values({ taskId, userId }).returning()
      return result
    },

    async addMany(taskId: string, userIds: string[]): Promise<void> {
      if (userIds.length === 0) return
      await db.insert(taskAssignees).values(userIds.map((userId) => ({ taskId, userId })))
    },

    async remove(taskId: string, userId: string): Promise<void> {
      await db
        .delete(taskAssignees)
        .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, userId)))
    },

    async removeAllForTask(taskId: string): Promise<void> {
      await db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId))
    },
  }
}

export type TaskAssigneeRepository = ReturnType<typeof createTaskAssigneeRepository>

export const TASK_ASSIGNEE_REPOSITORY = createToken<TaskAssigneeRepository>(
  'app/TaskAssignee/repository',
)
