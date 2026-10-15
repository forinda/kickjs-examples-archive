import { defineModule } from '@forinda/kickjs'
import { DRIZZLE_DB } from '@/db'
import {
  createRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '@/modules/auth/refresh-token.repository'
import { AuthController } from './presentation/auth.controller'

// Eagerly load use cases so @Service() decorators register in the DI container
import.meta.glob(['./application/use-cases/**/*.ts'], { eager: true })

export const AuthModule = defineModule({
  name: 'AuthModule',
  build: () => ({
    register(container) {
      container.registerFactory(REFRESH_TOKEN_REPOSITORY, () =>
        createRefreshTokenRepository(container.resolve(DRIZZLE_DB)),
      )
    },
    routes: () => ({ path: '/auth', controller: AuthController }),
  }),
})
