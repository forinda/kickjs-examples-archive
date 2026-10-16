import { defineModule } from '@forinda/kickjs'
import { PRISMA_CLIENT } from '@/db/prisma'
import { REFRESH_TOKEN_REPOSITORY, createRefreshTokenRepository } from './refresh-token.repository'
import { AuthController } from './auth.controller'

export const AuthModule = defineModule({
  name: 'AuthModule',
  build: () => ({
    register(container) {
      container.registerFactory(REFRESH_TOKEN_REPOSITORY, () =>
        createRefreshTokenRepository(container.resolve(PRISMA_CLIENT)),
      )
    },

    routes() {
      return {
        path: '/auth',
        controller: AuthController,
      }
    },
  }),
})
