import { defineModules } from '@forinda/kickjs'
import { CronModule } from './crons/cron.module'

// Every module the app mounts. `kick g module <name>` appends a `.mount(...)`
// line here; `kick rm module <name>` takes one out.
export const modules = defineModules().mount(CronModule())
