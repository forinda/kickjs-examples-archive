import { defineModule } from '@forinda/kickjs'
import { FeaturesController } from './features.controller'
import { FeatureSettings } from './features.settings'

export const FeaturesModule = defineModule({
  name: 'FeaturesModule',
  build: () => ({
    // Validated at startup and bound for injection before register() runs —
    // only when this module is mounted.
    settings: () => [FeatureSettings],
    routes: () => ({ path: '/features', controller: FeaturesController }),
  }),
})
