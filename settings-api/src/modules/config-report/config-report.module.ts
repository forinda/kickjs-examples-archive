import { defineModule, getEnv } from '@forinda/kickjs'
import { ConfigReportController } from './config-report.controller'

/** GET /api/v1/config — development only; nothing is mounted in production. */
export const ConfigReportModule = defineModule({
  name: 'ConfigReportModule',
  build: () => ({
    routes: () =>
      getEnv('NODE_ENV') === 'production'
        ? null
        : { path: '/config', controller: ConfigReportController },
  }),
})
