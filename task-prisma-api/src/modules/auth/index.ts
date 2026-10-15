import { defineModule } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'
import { PrismaRefreshTokenRepository } from './infrastructure/repositories/prisma-refresh-token.repository'
import { AuthController } from './presentation/auth.controller'

// Eagerly load use cases so @Service() decorators register in the DI container
import.meta.glob(['./application/use-cases/**/*.ts'], { eager: true })

export const AuthModule = defineModule({
  name: 'AuthModule',
  build: () => ({
    register(container) {
      container.registerFactory(TOKENS.REFRESH_TOKEN_REPOSITORY, () =>
        container.resolve(PrismaRefreshTokenRepository),
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
