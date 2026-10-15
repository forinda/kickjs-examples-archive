import type { ChannelEntity } from '@/modules/channels/domain/entities/channel.entity'
import type { ProjectEntity } from '@/modules/projects/domain/entities/project.entity'
import type { WorkspaceMemberEntity } from '@/modules/workspaces/domain/entities/workspace-member.entity'

/** Values the membership guards in this folder put on the request context. */
declare module '@forinda/kickjs' {
  interface ContextMeta {
    workspaceMember: WorkspaceMemberEntity
    project: ProjectEntity
    channel: ChannelEntity
  }
}
