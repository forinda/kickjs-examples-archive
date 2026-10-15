import { defineModules } from '@forinda/kickjs'
import { DbModule } from '../db/db.module'
import { UsersModule } from './users/users.module'
import { WorkspacesModule } from './workspaces/workspaces.module'
import { TasksModule } from './tasks/tasks.module'

export const modules = defineModules()
  .mount(DbModule())
  .mount(UsersModule())
  .mount(WorkspacesModule())
  .mount(TasksModule())
