import { Service, Inject, HttpException } from '@forinda/kickjs'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { ErrorCode } from '@/shared/constants/error-codes'
import { env } from '@/config'
import type { LoginDto } from '../dtos/login.dto'
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '@/modules/auth/infrastructure/repositories/refresh-token.repository'
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@/modules/users/infrastructure/repositories/user.repository'

@Service()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private userRepo: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY) private refreshTokenRepo: RefreshTokenRepository,
  ) {}

  async execute(dto: LoginDto) {
    const user = await this.userRepo.findByEmail(dto.email)
    if (!user) {
      throw HttpException.unauthorized(ErrorCode.INVALID_CREDENTIALS)
    }

    if (!user.isActive) {
      throw HttpException.forbidden(ErrorCode.USER_INACTIVE)
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!isPasswordValid) {
      throw HttpException.unauthorized(ErrorCode.INVALID_CREDENTIALS)
    }

    await this.userRepo.update(user._id.toString(), { lastLoginAt: new Date() })

    const accessToken = jwt.sign(
      { sub: user._id.toString(), email: user.email, globalRole: user.globalRole },
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN as any },
    )

    const refreshToken = crypto.randomUUID()
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await this.refreshTokenRepo.create({
      userId: user._id.toString(),
      token: refreshToken,
      expiresAt: refreshExpiresAt,
    })

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        globalRole: user.globalRole,
      },
      accessToken,
      refreshToken,
    }
  }
}
