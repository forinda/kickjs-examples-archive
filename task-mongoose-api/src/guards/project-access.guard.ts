import './context'
import {
  type RequestContext,
  type MiddlewareHandler,
  Container,
  HttpException,
} from '@forinda/kickjs'
import { ErrorCode } from '@/shared/error-codes'
import { PROJECT_REPOSITORY } from '@/modules/projects/project.repository'
import {
  WORKSPACE_MEMBER_REPOSITORY,
  type WorkspaceMemberRepository,
} from '@/modules/workspaces/workspace-member.repository'

export const projectAccessGuard: MiddlewareHandler = async (ctx: RequestContext, next) => {
  const user = ctx.get('user')
  if (!user) {
    throw HttpException.unauthorized('Authentication required')
  }

  const projectId = ctx.params.projectId
  if (!projectId) {
    return next()
  }

  const container = Container.getInstance()
  const projectRepo = container.resolve(PROJECT_REPOSITORY)
  const project = await projectRepo.findById(projectId)

  if (!project) {
    throw HttpException.notFound(ErrorCode.PROJECT_NOT_FOUND)
  }

  const memberRepo = container.resolve<WorkspaceMemberRepository>(WORKSPACE_MEMBER_REPOSITORY)
  const member = await memberRepo.findByUserAndWorkspace(user.id, project.workspaceId.toString())

  if (!member) {
    throw HttpException.forbidden(ErrorCode.NOT_WORKSPACE_MEMBER)
  }

  ctx.set('project', project)
  ctx.set('workspaceMember', member)
  next()
}
