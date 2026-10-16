import { Autowired, Cron, Logger, Service, type CronRun } from '@forinda/kickjs'
import { env } from '@/config'
import { CronService } from './cron.service'

const log = Logger.for('MaintenanceJobs')
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** `enabled` is checked on every tick, so CRON_DISABLED_JOBS switches a job off without code. */
const unlessDisabled = (name: string) => () => !env.CRON_DISABLED_JOBS.includes(name)

@Service()
export class MaintenanceJobs {
  @Autowired() private readonly cron!: CronService

  @Cron('*/5 * * * *', {
    name: 'purge-sessions',
    description: 'Drop expired sessions',
    enabled: unlessDisabled('purge-sessions'),
  })
  purgeSessions(run: CronRun) {
    return this.cron.track(run, async () => log.info('Purged expired sessions'))
  }

  // Timezone-aware: 02:00 in Nairobi (23:00 UTC), whatever the server's zone.
  @Cron('0 2 * * *', {
    name: 'nightly-report',
    description: 'Daily sales report at 2am Nairobi time',
    timezone: 'Africa/Nairobi',
    enabled: unlessDisabled('nightly-report'),
  })
  nightlyReport(run: CronRun) {
    return this.cron.track(run, async () => log.info('Nightly report generated'))
  }

  // Runs once at boot (trigger 'init'), then hourly.
  @Cron('0 * * * *', {
    name: 'warm-cache',
    description: 'Prime the catalogue cache',
    runOnInit: true,
    enabled: unlessDisabled('warm-cache'),
  })
  warmCache(run: CronRun) {
    return this.cron.track(run, async () => log.info(`Cache warmed (${run.trigger})`))
  }

  // Can outlast its interval. overlap: false (the default) skips a tick while
  // the previous run is still going — within this process.
  @Cron('*/2 * * * *', {
    name: 'sync-inventory',
    description: 'Pull stock levels from the supplier',
    overlap: false,
    enabled: unlessDisabled('sync-inventory'),
  })
  syncInventory(run: CronRun) {
    return this.cron.track(run, async () => {
      const items = await this.fetchSupplierStock()
      log.info(`Synced ${items} inventory items`)
    })
  }

  /** Stand-in for the supplier's API. */
  protected async fetchSupplierStock() {
    await sleep(env.INVENTORY_SYNC_MS)
    return 42
  }
}
