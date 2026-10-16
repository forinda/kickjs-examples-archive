import {
  Controller,
  Inject,
  Post,
  Autowired,
  reply,
  Middleware,
  type RequestContext,
} from '@forinda/kickjs'
import { ApiTags, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { successResponse } from '@/shared/api-response'
import { authBridgeMiddleware } from '@/middleware/auth-bridge.middleware'
import { getUser } from '@/shared/auth'
import { registerSchema, loginSchema, refreshTokenSchema } from './auth.dto'
import { REFRESH_TOKEN_REPOSITORY, type RefreshTokenRepository } from './refresh-token.repository'
import { AuthService } from './auth.service'

@Controller()
export class AuthController {
  @Autowired() private authService!: AuthService
  @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepo!: RefreshTokenRepository

  @Post('/register', { body: registerSchema, name: 'Register' })
  @ApiTags('Auth')
  async register(ctx: RequestContext) {
    const result = await this.authService.register(ctx.body)
    return reply.created(successResponse(result))
  }

  @Post('/login', { body: loginSchema, name: 'Login' })
  @ApiTags('Auth')
  async login(ctx: RequestContext) {
    const result = await this.authService.login(ctx.body)
    return successResponse(result)
  }

  @Post('/refresh', { body: refreshTokenSchema, name: 'RefreshToken' })
  @ApiTags('Auth')
  async refresh(ctx: RequestContext) {
    const result = await this.authService.refresh(ctx.body.refreshToken)
    return successResponse(result)
  }

  @Post('/logout')
  @ApiTags('Auth')
  @ApiBearerAuth()
  @Middleware(authBridgeMiddleware)
  async logout(ctx: RequestContext) {
    getUser(ctx) // Ensure authenticated
    const { refreshToken } = ctx.body
    await this.refreshTokenRepo.deleteByToken(refreshToken)
    return successResponse(null, 'Logged out successfully')
  }
}
