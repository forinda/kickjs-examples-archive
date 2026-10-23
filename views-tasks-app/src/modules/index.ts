import { defineModules } from '@forinda/kickjs'
import { AuthModule } from './auth/auth.module'
import { CategoriesModule } from './categories/categories.module'
import { HelloModule } from './hello/hello.module'
import { TasksModule } from './tasks/tasks.module'

// Every module the app mounts. `kick g module <name>` appends a `.mount(...)`
// line here; `kick rm module <name>` takes one out.
export const modules = defineModules()
  .mount(HelloModule())
  .mount(AuthModule())
  .mount(TasksModule())
  .mount(CategoriesModule())
