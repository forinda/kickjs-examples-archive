import { Service, Inject, HttpException } from '@forinda/kickjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { ErrorCode } from '@/shared/constants/error-codes'
import { env } from '@/config'
import { USER_REPOSITORY, type UserRepository } from '@/modules/users/user.repository'
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '@/modules/auth/refresh-token.repository'

@Service()
export class RefreshTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private userRepo: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private refreshTokenRepo: RefreshTokenRepository,
  ) {}

  async execute(token: string) {
    const existing = await this.refreshTokenRepo.findByToken(token)
    if (!existing) {
      throw HttpException.unauthorized(ErrorCode.TOKEN_INVALID)
    }

    if (new Date(existing.expiresAt) < new Date()) {
      await this.refreshTokenRepo.deleteByToken(token)
      throw HttpException.unauthorized(ErrorCode.TOKEN_EXPIRED)
    }

    const user = await this.userRepo.findById(existing.userId)
    if (!user) {
      throw HttpException.unauthorized(ErrorCode.USER_NOT_FOUND)
    }

    if (!user.isActive) {
      throw HttpException.forbidden(ErrorCode.USER_INACTIVE)
    }

    // Token rotation: delete old, create new
    await this.refreshTokenRepo.deleteByToken(token)

    const newRefreshToken = crypto.randomUUID()
    await this.refreshTokenRepo.create({
      userId: user.id,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        globalRole: user.globalRole,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN as string & jwt.SignOptions['expiresIn'] },
    )

    return { accessToken, refreshToken: newRefreshToken }
  }
}
