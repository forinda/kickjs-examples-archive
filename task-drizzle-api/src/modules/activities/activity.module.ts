import { defineModule } from '@forinda/kickjs'
import { DRIZZLE_DB } from '@/db'
import { createActivityRepository, ACTIVITY_REPOSITORY } from './activity.repository'
import { ActivityController } from './activity.controller'

export const ActivityModule = defineModule({
  name: 'ActivityModule',
  build: () => ({
    register(container) {
      container.registerFactory(ACTIVITY_REPOSITORY, () =>
        createActivityRepository(container.resolve(DRIZZLE_DB)),
      )
    },
    routes: () => ({ path: '/activities', controller: ActivityController }),
  }),
})
