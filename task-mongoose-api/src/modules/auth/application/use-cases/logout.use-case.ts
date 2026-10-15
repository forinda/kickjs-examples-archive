import { Service, Inject } from '@forinda/kickjs'
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '@/modules/auth/infrastructure/repositories/refresh-token.repository'

@Service()
export class LogoutUseCase {
  constructor(@Inject(REFRESH_TOKEN_REPOSITORY) private refreshTokenRepo: RefreshTokenRepository) {}

  async execute(refreshToken: string) {
    await this.refreshTokenRepo.deleteByToken(refreshToken)
  }
}
