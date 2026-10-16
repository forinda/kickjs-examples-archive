import { Inject, Service, type SettingsOf } from '@forinda/kickjs'
import { AppSettings } from '@/config/app.settings'
import { FeatureSettings } from './features.settings'

@Service()
export class FeaturesService {
  constructor(
    @Inject(FeatureSettings) private readonly features: SettingsOf<typeof FeatureSettings>,
    @Inject(AppSettings) private readonly app: SettingsOf<typeof AppSettings>,
  ) {}

  /** What the client should render for this user. */
  forUser(email?: string) {
    const { signups, betaBanner, betaTesters, maxUploadMb } = this.features
    return {
      app: this.app.name,
      signupUrl: signups ? new URL('/signup', this.app.publicUrl).href : null,
      betaBanner: betaBanner || (!!email && betaTesters.includes(email)),
      maxUploadBytes: maxUploadMb * 1024 * 1024,
    }
  }
}
