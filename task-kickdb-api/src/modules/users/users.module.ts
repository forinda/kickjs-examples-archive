import { defineModule } from '@forinda/kickjs'
import { UsersController } from './users.controller'

export const UsersModule = defineModule({
  name: 'UsersModule',
  build: () => ({
    routes: () => ({ path: '/users', controller: UsersController }),
  }),
})
