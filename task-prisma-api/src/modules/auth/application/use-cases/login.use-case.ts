import { Service, Inject, HttpException } from '@forinda/kickjs'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { ErrorCode } from '@/shared/constants/error-codes'
import { env } from '@/config'
import type { LoginDTO } from '../dtos/login.dto'
import { USER_REPOSITORY, type UserRepository } from '@/modules/users/user.repository'
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '@/modules/auth/refresh-token.repository'

@Service()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private userRepo: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private refreshTokenRepo: RefreshTokenRepository,
  ) {}

  async execute(dto: LoginDTO) {
    const user = await this.userRepo.findByEmail(dto.email)
    if (!user) {
      throw HttpException.unauthorized(ErrorCode.INVALID_CREDENTIALS)
    }

    if (!user.isActive) {
      throw HttpException.forbidden(ErrorCode.USER_INACTIVE)
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) {
      throw HttpException.unauthorized(ErrorCode.INVALID_CREDENTIALS)
    }

    await this.userRepo.update(user.id, { lastLoginAt: new Date() })

    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        globalRole: user.globalRole,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN as string & jwt.SignOptions['expiresIn'] },
    )

    const refreshToken = crypto.randomUUID()

    await this.refreshTokenRepo.create({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    const { passwordHash: _passwordHash, ...safeUser } = user
    return { user: safeUser, accessToken, refreshToken }
  }
}
