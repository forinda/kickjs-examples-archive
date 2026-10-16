import { Inject, Service, type SettingsOf } from '@forinda/kickjs'
import { AppSettings } from '@/config/app.settings'
import { FeatureSettings } from './feature.settings'

@Service()
export class FeaturesService {
  constructor(
    @Inject(FeatureSettings) private readonly features: SettingsOf<typeof FeatureSettings>,
    @Inject(AppSettings) private readonly app: SettingsOf<typeof AppSettings>,
  ) {}

  /** The public feature flags. */
  current() {
    const { signups, betaBanner, maxUploadMb } = this.features
    return {
      app: this.app.name,
      signupUrl: signups ? new URL('/signup', this.app.publicUrl).href : null,
      betaBanner,
      maxUploadBytes: maxUploadMb * 1024 * 1024,
    }
  }

  /**
   * For code that already knows who the user is (after authentication). Not
   * exposed over HTTP: answering it for any email a caller sends would let
   * anyone find out who is on the list.
   */
  isBetaTester(email: string): boolean {
    const wanted = email.toLowerCase()
    return this.features.betaTesters.some((tester) => tester.toLowerCase() === wanted)
  }
}
