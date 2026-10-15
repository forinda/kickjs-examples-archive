import { defineModules } from '@forinda/kickjs'
import { HelloModule } from './hello/hello.module'
import { ProjectModule } from './projects/project.module'

export const modules = defineModules().mount(HelloModule()).mount(ProjectModule())
