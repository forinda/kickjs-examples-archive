import { defineModule } from '@forinda/kickjs'
import { DRIZZLE_DB } from '@/db'
import {
  createRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from './refresh-token.repository'
import { AuthController } from './auth.controller'

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
