import { defineModule } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'
import { MongoUserRepository } from './infrastructure/repositories/mongo-user.repository'
import { UsersController } from './presentation/users.controller'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const UsersModule = defineModule({
  name: 'UsersModule',
  build: () => ({
    register(container) {
      container.registerFactory(TOKENS.USER_REPOSITORY, () =>
        container.resolve(MongoUserRepository),
      )
    },
    routes: () => ({ path: '/users', controller: UsersController }),
  }),
})
