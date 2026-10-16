import { Container, HttpException, type MiddlewareHandler } from '@forinda/kickjs'
import type { RequestContext } from '@forinda/kickjs'
import { PROJECT_REPOSITORY } from '@/modules/projects/project.repository'
import { TASK_REPOSITORY } from '@/modules/tasks/task.repository'
import { COMMENT_REPOSITORY } from '@/modules/comments/comment.repository'
import { ATTACHMENT_REPOSITORY } from '@/modules/attachments/attachment.repository'
import { LABEL_REPOSITORY } from '@/modules/labels/label.repository'
import { CHANNEL_REPOSITORY } from '@/modules/channels/channel.repository'
import type { WorkspaceMember } from '@/modules/workspaces/workspace-member.repository'
import { requireWorkspaceMember } from './workspace-membership.guard'

export type Resource = 'project' | 'task' | 'comment' | 'attachment' | 'label' | 'channel'

const container = () => Container.getInstance()

/** The workspace a record belongs to, or null when there is no such record. */
const workspaceOf: Record<Resource, (id: string) => Promise<string | null>> = {
  project: async (id) =>
    (await container().resolve(PROJECT_REPOSITORY).findById(id))?.workspaceId ?? null,
  task: async (id) =>
    (await container().resolve(TASK_REPOSITORY).findById(id))?.workspaceId ?? null,
  comment: async (id) => {
    const comment = await container().resolve(COMMENT_REPOSITORY).findById(id)
    return comment ? workspaceOf.task(comment.taskId) : null
  },
  attachment: async (id) => {
    const attachment = await container().resolve(ATTACHMENT_REPOSITORY).findById(id)
    return attachment ? workspaceOf.task(attachment.taskId) : null
  },
  label: async (id) =>
    (await container().resolve(LABEL_REPOSITORY).findById(id))?.workspaceId ?? null,
  channel: async (id) =>
    (await container().resolve(CHANNEL_REPOSITORY).findById(id))?.workspaceId ?? null,
}

const NOT_FOUND: Record<Resource, string> = {
  project: 'Project not found',
  task: 'Task not found',
  comment: 'Comment not found',
  attachment: 'Attachment not found',
  label: 'Label not found',
  channel: 'Channel not found',
}

export function workspaceIdOf(resource: Resource, id: string): Promise<string | null> {
  return workspaceOf[resource](id)
}

/**
 * The record must exist in one of the caller's workspaces. Missing record and
 * someone else's record get the same 404.
 */
export async function requireAccess(
  ctx: RequestContext,
  resource: Resource,
  id: string | null | undefined,
): Promise<WorkspaceMember> {
  const workspaceId = id ? await workspaceOf[resource](id) : null
  return requireWorkspaceMember(ctx, workspaceId, NOT_FOUND[resource])
}

/** Route guard: `ctx.params[param]` names a `resource` the caller may access. */
export const access =
  (resource: Resource, param = 'id'): MiddlewareHandler =>
  async (ctx: RequestContext, next) => {
    await requireAccess(ctx, resource, ctx.params[param])
    next()
  }

/** A list endpoint's required filter, e.g. `?projectId=`. */
export function requiredQuery(ctx: RequestContext, name: string): string {
  const value = ctx.query[name]
  if (typeof value !== 'string' || !value) {
    throw HttpException.badRequest(`${name} query parameter is required`)
  }
  return value
}
