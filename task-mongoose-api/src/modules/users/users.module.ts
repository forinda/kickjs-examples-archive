import { defineModule } from '@forinda/kickjs'
import { UsersController } from './users.controller'
import {
  USER_REPOSITORY,
  createUserRepository,
} from './user.repository'
import { MONGO_CONNECTION } from '@/adapters/mongoose.adapter'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const UsersModule = defineModule({
  name: 'UsersModule',
  build: () => ({
    register(container) {
      container.registerFactory(USER_REPOSITORY, () =>
        createUserRepository(container.resolve(MONGO_CONNECTION)),
      )
    },
    routes: () => ({ path: '/users', controller: UsersController }),
  }),
})
