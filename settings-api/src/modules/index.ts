import { defineModules } from '@forinda/kickjs'
import { FeaturesModule } from './features/feature.module'
import { ConfigReportModule } from './config-reports/config-report.module'

// Every module the app mounts. `kick g module <name>` appends a `.mount(...)`
// line here; `kick rm module <name>` takes one out.
export const modules = defineModules().mount(FeaturesModule()).mount(ConfigReportModule())
