import { Service, Inject, HttpException } from '@forinda/kickjs'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { ErrorCode } from '@/shared/constants/error-codes'
import { env } from '@/config/env'
import type { LoginDTO } from '../dtos/login.dto'
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '@/modules/auth/refresh-token.repository'
import { USER_REPOSITORY, type UserRepository } from '@/modules/users/user.repository'

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

    if (!(user as any).isActive) {
      throw HttpException.forbidden(ErrorCode.USER_INACTIVE)
    }

    const valid = await bcrypt.compare(dto.password, (user as any).passwordHash)
    if (!valid) {
      throw HttpException.unauthorized(ErrorCode.INVALID_CREDENTIALS)
    }

    await this.userRepo.update(user.id, { lastLoginAt: new Date() } as any)

    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: (user as any).email,
        globalRole: (user as any).globalRole,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN as any },
    )

    const refreshToken = crypto.randomUUID()

    await this.refreshTokenRepo.create({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    const { passwordHash: _passwordHash, ...publicUser } = user
    return { user: publicUser, accessToken, refreshToken }
  }
}
