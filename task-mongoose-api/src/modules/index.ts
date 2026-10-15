import { defineModules } from '@forinda/kickjs'
import { QueueModule } from '@/modules/queue/queue.module'
import { CronModule } from '@/modules/cron/cron.module'
import { AuthModule } from '@/modules/auth/auth.module'
import { UsersModule } from '@/modules/users/users.module'
import { WorkspacesModule } from '@/modules/workspaces/workspaces.module'
import { ProjectsModule } from '@/modules/projects/projects.module'
import { LabelsModule } from '@/modules/labels/labels.module'
import { TasksModule } from '@/modules/tasks/tasks.module'
import { CommentsModule } from '@/modules/comments/comments.module'
import { AttachmentsModule } from '@/modules/attachments/attachments.module'
import { ActivityModule } from '@/modules/activity/activity.module'
import { NotificationsModule } from '@/modules/notifications/notifications.module'
import { ChannelsModule } from '@/modules/channels/channels.module'
import { MessagesModule } from '@/modules/messages/messages.module'
import { StatsModule } from '@/modules/stats/stats.module'

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
