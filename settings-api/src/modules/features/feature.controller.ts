import { Autowired, Controller, Get } from '@forinda/kickjs'
import { FeaturesService } from './feature.service'

@Controller()
export class FeaturesController {
  @Autowired() private readonly features!: FeaturesService

  @Get('/')
  get() {
    return this.features.current()
  }
}
