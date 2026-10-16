import {
  type RequestContext,
  type MiddlewareHandler,
  Container,
  HttpException,
} from '@forinda/kickjs'
import { ErrorCode } from '@/shared/error-codes'
import { TASK_REPOSITORY, type TaskRepository } from '@/modules/tasks/task.repository'
import type { TaskEntity } from '@/modules/tasks/task.schema'
import { findWorkspaceMember } from '@/guards/workspace-membership.guard'
import { getUser } from '@/auth'

/** What this guard puts on the request context. */
declare module '@forinda/kickjs' {
  interface ContextMeta {
    task: TaskEntity
  }
}

/** The task (and the user's workspace membership) when the user is in its workspace; null otherwise. */
export async function findTaskForMember(userId: string, taskId: string) {
  const task = await Container.getInstance()
    .resolve<TaskRepository>(TASK_REPOSITORY)
    .findById(taskId)
  if (!task) return null
  const member = await findWorkspaceMember(userId, task.workspaceId.toString())
  return member ? { task, member } : null
}

/**
 * Routes under `/tasks/:taskId`: a non-member gets the same 404 as a missing
 * task, so task ids from other workspaces can't be probed.
 */
export const taskAccessGuard: MiddlewareHandler = async (ctx: RequestContext, next) => {
  const access = await findTaskForMember(getUser(ctx).id, ctx.params.taskId)
  if (!access) throw HttpException.notFound(ErrorCode.TASK_NOT_FOUND)
  ctx.set('task', access.task)
  ctx.set('workspaceMember', access.member)
  next()
}
