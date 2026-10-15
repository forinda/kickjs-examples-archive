import { defineModules } from '@forinda/kickjs'
import { UserModule } from './users/user.module'
import { AuthModule } from './auth/auth.module'
import { WorkspaceModule } from './workspaces/workspace.module'
import { ProjectModule } from './projects/project.module'
import { TaskModule } from './tasks/task.module'
import { LabelModule } from './labels/label.module'
import { CommentModule } from './comments/comment.module'
import { AttachmentModule } from './attachments/attachment.module'
import { NotificationModule } from './notifications/notification.module'
import { ActivityModule } from './activities/activity.module'
import { ChannelModule } from './channels/channel.module'
import { MessageModule } from './messages/message.module'
import { StatModule } from './stats/stats.module'
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
