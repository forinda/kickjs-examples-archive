import {
  Autowired,
  Container,
  Controller,
  Get,
  HttpException,
  Middleware,
  Post,
  runCronJobs,
  type Ctx,
} from '@forinda/kickjs'
import { cronSecretGuard } from '@/guards/cron-secret.guard'
import { CronService } from './cron.service'

@Controller()
export class CronController {
  @Autowired() private readonly cron!: CronService

  /** Every job with its schedule, enabled state, last run and next run. */
  @Get('/jobs')
  list(_ctx: Ctx<KickRoutes.CronController['list']>) {
    return this.cron.list()
  }

  /** Run a job now (trigger 'manual'). Respects enabled + overlap: a busy job answers ran: 0. */
  @Post('/jobs/:name/run')
  @Middleware(cronSecretGuard)
  async run(ctx: Ctx<KickRoutes.CronController['run']>) {
    const { name } = ctx.params
    if (!this.cron.list().some((job) => job.name === name)) {
      throw HttpException.notFound(`No cron job named "${name}"`)
    }
    return runCronJobs(Container.getInstance(), { name }, 'manual')
  }
}
