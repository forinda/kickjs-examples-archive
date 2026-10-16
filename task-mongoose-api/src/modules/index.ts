import { defineModules } from '@forinda/kickjs'
import { QueueModule } from '@/modules/queues/queue.module'
import { CronModule } from '@/modules/crons/cron.module'
import { AuthModule } from '@/modules/auth/auth.module'
import { UsersModule } from '@/modules/users/user.module'
import { WorkspacesModule } from '@/modules/workspaces/workspace.module'
import { ProjectsModule } from '@/modules/projects/project.module'
import { LabelsModule } from '@/modules/labels/label.module'
import { TasksModule } from '@/modules/tasks/task.module'
import { CommentsModule } from '@/modules/comments/comment.module'
import { AttachmentsModule } from '@/modules/attachments/attachment.module'
import { ActivityModule } from '@/modules/activities/activity.module'
import { NotificationsModule } from '@/modules/notifications/notification.module'
import { ChannelsModule } from '@/modules/channels/channel.module'
import { MessagesModule } from '@/modules/messages/message.module'
import { StatsModule } from '@/modules/stats/stat.module'

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
