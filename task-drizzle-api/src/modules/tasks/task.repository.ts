import { createToken, HttpException, type ParsedQuery } from '@forinda/kickjs'
import { asc, eq, sql } from 'drizzle-orm'
import type { AppDatabase } from '@/db'
import { tasks } from '@/db/schema'
import { TASK_QUERY_CONFIG } from '@/modules/tasks/constants'
import { queryAdapter } from '@/shared/infrastructure/query-adapter'

export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert

export function createTaskRepository(db: AppDatabase) {
  return {
    async findById(id: string): Promise<Task | null> {
      const [task] = await db.select().from(tasks).where(eq(tasks.id, id))
      return task ?? null
    },

    async findByProject(projectId: string): Promise<Task[]> {
      return db
        .select()
        .from(tasks)
        .where(eq(tasks.projectId, projectId))
        .orderBy(asc(tasks.orderIndex))
    },

    async findPaginated(
      parsed: ParsedQuery,
      projectId?: string,
    ): Promise<{ data: Task[]; total: number }> {
      const query = queryAdapter.buildFromColumns(parsed, {
        ...TASK_QUERY_CONFIG,
        ...(projectId ? { baseCondition: eq(tasks.projectId, projectId) } : {}),
      })

      const [data, countResult] = await Promise.all([
        db
          .select()
          .from(tasks)
          .where(query.where)
          .orderBy(...query.orderBy)
          .limit(query.limit)
          .offset(query.offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(tasks)
          .where(query.where),
      ])

      return { data, total: countResult[0]?.count ?? 0 }
    },

    async findSubtasks(parentTaskId: string): Promise<Task[]> {
      return db
        .select()
        .from(tasks)
        .where(eq(tasks.parentTaskId, parentTaskId))
        .orderBy(asc(tasks.orderIndex))
    },

    async create(dto: NewTask): Promise<Task> {
      const [task] = await db.insert(tasks).values(dto).returning()
      return task
    },

    async update(id: string, dto: Partial<NewTask>): Promise<Task> {
      const [task] = await db.update(tasks).set(dto).where(eq(tasks.id, id)).returning()
      if (!task) throw HttpException.notFound('Task not found')
      return task
    },

    async delete(id: string): Promise<void> {
      await db.delete(tasks).where(eq(tasks.id, id))
    },
  }
}

export type TaskRepository = ReturnType<typeof createTaskRepository>

export const TASK_REPOSITORY = createToken<TaskRepository>('app/Task/repository')
