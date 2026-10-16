import { getEnv, Service, Inject, HttpException } from '@forinda/kickjs'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { ErrorCode } from '@/shared/error-codes'
import { USER_REPOSITORY, type UserRepository } from '@/modules/users/user.repository'
import { REFRESH_TOKEN_REPOSITORY, type RefreshTokenRepository } from './refresh-token.repository'
import type { LoginDTO, RegisterDTO } from './auth.dto'

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

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
    })

    const accessToken = this.generateAccessToken(user)
    const refreshToken = await this.issueRefreshToken(user.id)

    return { user, accessToken, refreshToken }
  }

  async login(dto: LoginDTO) {
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

    const accessToken = this.generateAccessToken(user)
    const refreshToken = await this.issueRefreshToken(user.id)

    const { passwordHash: _passwordHash, ...safeUser } = user
    return { user: safeUser, accessToken, refreshToken }
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

    if (!user.isActive) {
      throw HttpException.forbidden(ErrorCode.USER_INACTIVE)
    }

    // Token rotation: delete old, create new
    await this.refreshTokenRepo.deleteByToken(token)
    const newRefreshToken = await this.issueRefreshToken(user.id)

    const accessToken = this.generateAccessToken(user)

    return { accessToken, refreshToken: newRefreshToken }
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomUUID()
    await this.refreshTokenRepo.create({
      userId,
      token,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    })
    return token
  }

  private generateAccessToken(user: { id: string; email: string; globalRole: string }): string {
    return jwt.sign(
      { sub: user.id, email: user.email, globalRole: user.globalRole },
      getEnv('JWT_SECRET'),
      { expiresIn: getEnv('JWT_ACCESS_EXPIRES_IN') as string & jwt.SignOptions['expiresIn'] },
    )
  }
}
