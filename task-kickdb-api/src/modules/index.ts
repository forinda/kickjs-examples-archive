import { defineModules } from '@forinda/kickjs'
import { UserModule } from './users/user.module'
import { WorkspaceModule } from './workspaces/workspace.module'
import { TaskModule } from './tasks/task.module'

export const modules = defineModules()
  .mount(UserModule())
  .mount(WorkspaceModule())
  .mount(TaskModule())
