import { defineModule } from '@forinda/kickjs'
import { FeaturesController } from './feature.controller'
import { FeatureSettings } from './feature.settings'

export const FeaturesModule = defineModule({
  name: 'FeaturesModule',
  build: () => ({
    // Validated at startup and bound for injection before register() runs —
    // only when this module is mounted.
    settings: () => [FeatureSettings],
    routes: () => ({ path: '/features', controller: FeaturesController }),
  }),
})
