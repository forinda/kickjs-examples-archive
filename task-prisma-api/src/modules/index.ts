import { defineModules } from '@forinda/kickjs'
import { UserModule } from './users'
import { AuthModule } from './auth'
import { WorkspaceModule } from './workspaces'
import { ProjectModule } from './projects'
import { TaskModule } from './tasks'
import { LabelModule } from './labels'
import { CommentModule } from './comments'
import { AttachmentModule } from './attachments'
import { NotificationModule } from './notifications'
import { ActivityModule } from './activities'
import { ChannelModule } from './channels'
import { MessageModule } from './messages'
import { StatModule } from './stats'
import { QueueModule } from './queue/queue.module'

export const modules = defineModules()
  .mount(UserModule())
  .mount(AuthModule())
  .mount(WorkspaceModule())
  .mount(ProjectModule())
  .mount(TaskModule())
  .mount(LabelModule())
  .mount(CommentModule())
  .mount(AttachmentModule())
  .mount(NotificationModule())
  .mount(ActivityModule())
  .mount(ChannelModule())
  .mount(MessageModule())
  .mount(StatModule())
  .mount(QueueModule())
