import { defineModule } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'
import { MongoRefreshTokenRepository } from './infrastructure/repositories/mongo-refresh-token.repository'
import { AuthController } from './presentation/auth.controller'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const AuthModule = defineModule({
  name: 'AuthModule',
  build: () => ({
    register(container) {
      container.registerFactory(TOKENS.REFRESH_TOKEN_REPOSITORY, () =>
        container.resolve(MongoRefreshTokenRepository),
      )
    },
    routes: () => ({ path: '/auth', controller: AuthController }),
  }),
})
