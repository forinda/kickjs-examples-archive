import 'reflect-metadata'
// Side-effect import — registers the env schema before anything resolves @Value / ConfigService.
import './config'
import { bootstrap, expressRuntime } from '@forinda/kickjs'
import { modules } from './modules'
import { adapters } from './config/adapters'
import { middlewares } from './config/middleware'
import { plugins } from './config/plugins'

export const app = await bootstrap({
  modules,
  runtime: expressRuntime(),
  middlewares,
  adapters,
  plugins,
  apiPrefix: '/api',
  defaultVersion: 1,
})
