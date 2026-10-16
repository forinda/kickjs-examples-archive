import { getEnv, Service, Inject, HttpException } from '@forinda/kickjs'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { ErrorCode } from '@/shared/error-codes'
import type { LoginDTO, RegisterDTO } from './auth.dto'
import { REFRESH_TOKEN_REPOSITORY, type RefreshTokenRepository } from './refresh-token.repository'
import { USER_REPOSITORY, type UserRepository } from '@/modules/users/user.repository'

@Service()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY)
    private userRepo: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private refreshTokenRepo: RefreshTokenRepository,
  ) {}

  async register(dto: RegisterDTO) {
    const existing = await this.userRepo.findByEmail(dto.email)
    if (existing) {
      throw HttpException.conflict(ErrorCode.EMAIL_ALREADY_EXISTS)
    }

    const passwordHash = await bcrypt.hash(dto.password, 12)

    const user = await this.userRepo.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    } as any)

    const accessToken = this.generateAccessToken(user)
    const refreshToken = crypto.randomUUID()

    await this.refreshTokenRepo.create({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    return { user, accessToken, refreshToken }
  }

  private generateAccessToken(user: any): string {
    return jwt.sign(
      { sub: user.id, email: user.email, globalRole: user.globalRole },
      getEnv('JWT_SECRET'),
      { expiresIn: getEnv('JWT_ACCESS_EXPIRES_IN') as any },
    )
  }

  async login(dto: LoginDTO) {
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
      getEnv('JWT_SECRET'),
      { expiresIn: getEnv('JWT_ACCESS_EXPIRES_IN') as any },
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

  async refresh(token: string) {
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

    if (!(user as any).isActive) {
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
        email: (user as any).email,
        globalRole: (user as any).globalRole,
      },
      getEnv('JWT_SECRET'),
      { expiresIn: getEnv('JWT_ACCESS_EXPIRES_IN') as any },
    )

    return { accessToken, refreshToken: newRefreshToken }
  }
}
