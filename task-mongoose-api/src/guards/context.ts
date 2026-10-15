import type { ChannelEntity } from '@/modules/channels/channel.schema'
import type { ProjectEntity } from '@/modules/projects/project.schema'
import type { WorkspaceMemberEntity } from '@/modules/workspaces/workspace-member.schema'

/** Values the membership guards in this folder put on the request context. */
declare module '@forinda/kickjs' {
  interface ContextMeta {
    workspaceMember: WorkspaceMemberEntity
    project: ProjectEntity
    channel: ChannelEntity
  }
}
