import { defineModule } from '@forinda/kickjs'
import { AuthController } from './presentation/auth.controller'
import {
  REFRESH_TOKEN_REPOSITORY,
  createRefreshTokenRepository,
} from '@/modules/auth/infrastructure/repositories/refresh-token.repository'
import { MONGO_CONNECTION } from '@/shared/infrastructure/database/mongoose.adapter'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const AuthModule = defineModule({
  name: 'AuthModule',
  build: () => ({
    register(container) {
      container.registerFactory(REFRESH_TOKEN_REPOSITORY, () =>
        createRefreshTokenRepository(container.resolve(MONGO_CONNECTION)),
      )
    },
    routes: () => ({ path: '/auth', controller: AuthController }),
  }),
})
