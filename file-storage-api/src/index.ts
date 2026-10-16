import 'reflect-metadata'
// Side-effect import — registers the env schema before anything reads it.
import './config'
import { bootstrap, expressRuntime } from '@forinda/kickjs'
import { modules } from './modules'
import { StorageAdapter } from './adapters/storage.adapter'

export const app = await bootstrap({
  modules,
  runtime: expressRuntime(),
  adapters: [StorageAdapter()],
})
