import { defineModule } from '@forinda/kickjs'
import { DB_PRIMARY } from '@forinda/kickjs-db'
import { UsersController } from './users.controller'
import { createUsersRepository, USERS_REPOSITORY } from './users.repository'

export const UsersModule = defineModule({
  name: 'UsersModule',
  build: () => ({
    register(container) {
      container.registerFactory(USERS_REPOSITORY, () =>
        createUsersRepository(container.resolve(DB_PRIMARY)),
      )
    },
    routes: () => ({ path: '/users', controller: UsersController }),
  }),
})
