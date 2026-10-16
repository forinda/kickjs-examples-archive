import { defineModule } from '@forinda/kickjs'
import { isDevOrTest } from '@/config/dev-default'
import { ConfigReportController } from './config-report.controller'

/**
 * GET /api/v1/config — development and tests only. Fails closed: production
 * and an unset NODE_ENV mount nothing (the schema's NODE_ENV default is
 * 'development', so it can't be the check).
 */
export const ConfigReportModule = defineModule({
  name: 'ConfigReportModule',
  build: () => ({
    routes: () =>
      isDevOrTest() ? { path: '/config', controller: ConfigReportController } : null,
  }),
})
