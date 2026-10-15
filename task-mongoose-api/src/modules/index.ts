import { defineModules } from '@forinda/kickjs'
import { QueueModule } from './queue/queue.module'
import { CronModule } from './cron/cron.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { WorkspacesModule } from './workspaces/workspaces.module'
import { ProjectsModule } from './projects/projects.module'
import { LabelsModule } from './labels/labels.module'
import { TasksModule } from './tasks/tasks.module'
import { CommentsModule } from './comments/comments.module'
import { AttachmentsModule } from './attachments/attachments.module'
import { ActivityModule } from './activity/activity.module'
import { NotificationsModule } from './notifications/notifications.module'
import { ChannelsModule } from './channels/channels.module'
import { MessagesModule } from './messages/messages.module'
import { StatsModule } from './stats/stats.module'

export const modules = defineModules()
  .mount(QueueModule())
  .mount(CronModule())
  .mount(AuthModule())
  .mount(UsersModule())
  .mount(WorkspacesModule())
  .mount(ProjectsModule())
  .mount(LabelsModule())
  .mount(TasksModule())
  .mount(CommentsModule())
  .mount(AttachmentsModule())
  .mount(ActivityModule())
  .mount(NotificationsModule())
  .mount(ChannelsModule())
  .mount(MessagesModule())
  .mount(StatsModule())
