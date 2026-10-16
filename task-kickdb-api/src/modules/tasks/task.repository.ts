import { createToken } from '@forinda/kickjs'
import type { KickDbClient } from '@forinda/kickjs-db'

export interface NewTask {
  projectId: string
  workspaceId: string
  key: string
  title: string
  reporterId: string
  description?: string | null
  /** Maps to a kanban column literal — kept loose so the DB default flows. */
  status?: string
  /** Allowed values are constrained by the `task_priority` PG enum. */
  priority?: 'critical' | 'high' | 'medium' | 'low' | 'none'
  estimatePoints?: number | null
  parentTaskId?: string | null
  dueDate?: Date | null
}

/** Repository over the kick/db client; deps come in as parameters. */
export function createTaskRepository(db: KickDbClient) {
  return {
    listByWorkspace(workspaceId: string) {
      return db
        .selectFrom('tasks')
        .selectAll()
        .where('workspaceId', '=', workspaceId)
        .orderBy('createdAt', 'desc')
        .execute()
    },

    listByProject(projectId: string) {
      return db
        .selectFrom('tasks')
        .selectAll()
        .where('projectId', '=', projectId)
        .orderBy('orderIndex', 'asc')
        .execute()
    },

    findById(id: string) {
      return db.selectFrom('tasks').selectAll().where('id', '=', id).executeTakeFirst()
    },

    // Single round-trip fetch of a task plus its comments, assignees,
    // and labels via the relational query layer. Replaces the
    // four-query N+1 (task → comments → assignees → labels) the older
    // `findById` would force on the controller.
    //
    // The `with` keys are checked against the `KickDbRelationsRegister`
    // augmentation in `src/db/relations-register.ts`; mistyping a key
    // here is a compile error, not a runtime surprise.
    //
    // Pass `ctx.signal` from the controller to cancel the in-flight
    // query when the HTTP client disconnects mid-request — kickjs-db
    // M5.A.2 maps the abort to `RelationalQueryCancelledError` and
    // the underlying Kysely driver short-circuits the pending query.
    findFullById(id: string, signal?: AbortSignal) {
      return db.query.tasks.findUnique({
        where: (_t, eb) => eb('id', '=', id),
        with: {
          comments: true,
          assignees: true,
          labels: true,
        },
        signal,
      })
    },

    // status / priority are defaulted in the schema, so the spread
    // is the natural insert shape — Generated columns (id, createdAt,
    // updatedAt) and explicit DB defaults can be omitted; the DB fills
    // them in. priority is a PG enum so the type narrows automatically.
    create(input: NewTask) {
      return db
        .insertInto('tasks')
        .values({
          projectId: input.projectId,
          workspaceId: input.workspaceId,
          key: input.key,
          title: input.title,
          reporterId: input.reporterId,
          description: input.description ?? null,
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          estimatePoints: input.estimatePoints ?? null,
          parentTaskId: input.parentTaskId ?? null,
          dueDate: input.dueDate ?? null,
        })
        .returningAll()
        .executeTakeFirstOrThrow()
    },

    updateStatus(id: string, status: string) {
      return db
        .updateTable('tasks')
        .set({ status, updatedAt: new Date() })
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst()
    },
  }
}

/** The contract, derived from the factory rather than declared beside it. */
export type TaskRepository = ReturnType<typeof createTaskRepository>
export const TASK_REPOSITORY = createToken<TaskRepository>('app/Task/repository')
