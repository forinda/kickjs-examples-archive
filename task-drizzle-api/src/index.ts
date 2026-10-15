import 'reflect-metadata'
// Side-effect import — registers the env schema before anything resolves @Value / ConfigService.
import './config/env'
import { bootstrap, expressRuntime } from '@forinda/kickjs'
import { modules } from './modules'
import { adapters, middlewares, plugins } from './config'

export const app = await bootstrap({
  modules,
  runtime: expressRuntime(),
  adapters,
  plugins,
  middlewares,
  apiPrefix: '/api',
  defaultVersion: 1,
})
