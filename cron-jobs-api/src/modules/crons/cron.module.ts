import { defineModule } from '@forinda/kickjs'
import { CronController } from './cron.controller'
// The @Cron class only has to be resolvable; importing it registers it.
import './cron.jobs'

export const CronModule = defineModule({
  name: 'CronModule',
  build: () => ({
    routes() {
      return { path: '/cron', controller: CronController }
    },
  }),
})
