import { Autowired, Controller, Get, type Ctx } from '@forinda/kickjs'
import { z } from 'zod'
import { FeaturesService } from './features.service'

export const featuresQuery = z.object({ email: z.email().optional() })

@Controller()
export class FeaturesController {
  @Autowired() private readonly features!: FeaturesService

  @Get('/', { query: featuresQuery })
  get(ctx: Ctx<KickRoutes.FeaturesController['get']>) {
    return this.features.forUser(ctx.query.email)
  }
}
