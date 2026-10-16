import { defineModule } from '@forinda/kickjs'
import { DB_PRIMARY } from '@forinda/kickjs-db'
import { UserController } from './user.controller'
import { createUserRepository, USER_REPOSITORY } from './user.repository'

export const UserModule = defineModule({
  name: 'UserModule',
  build: () => ({
    register(container) {
      container.registerFactory(USER_REPOSITORY, () =>
        createUserRepository(container.resolve(DB_PRIMARY)),
      )
    },
    routes: () => ({ path: '/users', controller: UserController }),
  }),
})
