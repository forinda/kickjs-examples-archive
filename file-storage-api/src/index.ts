import 'reflect-metadata'
// Side-effect import — registers the env schema before anything reads it.
import './config'
import { bootstrap, expressRuntime } from '@forinda/kickjs'
import { StorageAdapter } from './adapters/storage.adapter'
import { modules } from './modules'

export const app = await bootstrap({
  modules,
  runtime: expressRuntime(),
  adapters: [StorageAdapter()],
})
