import { Service, Inject, HttpException } from '@forinda/kickjs'
import jwt from 'jsonwebtoken'
import { ErrorCode } from '@/shared/constants/error-codes'
import { env } from '@/config'
import type { RefreshTokenDto } from '../dtos/refresh-token.dto'
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '@/modules/auth/infrastructure/repositories/refresh-token.repository'
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@/modules/users/infrastructure/repositories/user.repository'

@Service()
export class RefreshTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private userRepo: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY) private refreshTokenRepo: RefreshTokenRepository,
  ) {}

  async execute(dto: RefreshTokenDto) {
    const stored = await this.refreshTokenRepo.findByToken(dto.refreshToken)
    if (!stored || stored.expiresAt < new Date()) {
      throw HttpException.unauthorized(ErrorCode.TOKEN_EXPIRED)
    }

    const user = await this.userRepo.findById(stored.userId.toString())
    if (!user || !user.isActive) {
      throw HttpException.unauthorized(ErrorCode.USER_NOT_FOUND)
    }

    // Rotate refresh token
    await this.refreshTokenRepo.deleteByToken(dto.refreshToken)
    const newRefreshToken = crypto.randomUUID()
    await this.refreshTokenRepo.create({
      userId: user._id.toString(),
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    const accessToken = jwt.sign(
      { sub: user._id.toString(), email: user.email, globalRole: user.globalRole },
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN as any },
    )

    return { accessToken, refreshToken: newRefreshToken }
  }
}
