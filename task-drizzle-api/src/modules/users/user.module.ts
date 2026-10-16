import { defineModule } from '@forinda/kickjs'
import { DRIZZLE_DB } from '@/db'
import { createUserRepository, USER_REPOSITORY } from './user.repository'
import { UserController } from './user.controller'

export const UserModule = defineModule({
  name: 'UserModule',
  build: () => ({
    register(container) {
      container.registerFactory(USER_REPOSITORY, () =>
        createUserRepository(container.resolve(DRIZZLE_DB)),
      )
    },
    routes: () => ({ path: '/users', controller: UserController }),
  }),
})
