import {
  Service,
  Inject,
  HttpException,
  Logger,
  JOB_DISPATCHER,
  type JobDispatcher,
} from '@forinda/kickjs'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { ErrorCode } from '@/shared/error-codes'
import { env } from '@/config'
import type { LoginDto, RefreshTokenDto, RegisterDto } from './auth.dto'
import { REFRESH_TOKEN_REPOSITORY, type RefreshTokenRepository } from './refresh-token.repository'
import { USER_REPOSITORY, type UserRepository } from '@/modules/users/user.repository'

const logger = Logger.for('AuthService')

@Service()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private userRepo: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY) private refreshTokenRepo: RefreshTokenRepository,
    @Inject(JOB_DISPATCHER) private jobs: JobDispatcher,
  ) {}

  async register(dto: RegisterDto) {
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
      globalRole: 'user',
      isActive: true,
    })

    const accessToken = this.generateAccessToken(user)
    const refreshToken = crypto.randomUUID()
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await this.refreshTokenRepo.create({
      userId: user._id.toString(),
      token: refreshToken,
      expiresAt: refreshExpiresAt,
    })

    // Queue welcome email
    try {
      await this.jobs.dispatch(
        'email',
        'send-welcome-email',
        {
          email: user.email,
          firstName: user.firstName,
        },
        { delay: 5000 },
      ) // delay to ensure user creation completes
    } catch {
      logger.warn('Failed to queue welcome email — continuing registration')
    }

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

  async login(dto: LoginDto) {
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

    const accessToken = this.generateAccessToken(user)

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

  async refresh(dto: RefreshTokenDto) {
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

    const accessToken = this.generateAccessToken(user)

    return { accessToken, refreshToken: newRefreshToken }
  }

  private generateAccessToken(user: any): string {
    return jwt.sign(
      { sub: user._id.toString(), email: user.email, globalRole: user.globalRole },
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN as any },
    )
  }
}
