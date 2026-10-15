import { defineModule } from '@forinda/kickjs'
import { UsersController } from './presentation/users.controller'
import {
  USER_REPOSITORY,
  createUserRepository,
} from '@/modules/users/infrastructure/repositories/user.repository'
import { MONGO_CONNECTION } from '@/shared/infrastructure/database/mongoose.adapter'

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
