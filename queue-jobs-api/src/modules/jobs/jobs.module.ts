import { defineModule } from '@forinda/kickjs'
import { JobsController } from './jobs.controller'

export const JobsModule = defineModule({
  name: 'JobsModule',
  build: () => ({
    routes() {
      return { path: '/jobs', controller: JobsController }
    },
  }),
})
