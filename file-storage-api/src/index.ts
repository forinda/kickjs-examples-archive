/// <reference types="@forinda/kickjs-vite/globals" />
import 'reflect-metadata'
// Side-effect import — registers the env schema before anything reads it.
import './config'
import { bootstrap, expressRuntime, type AppAdapter } from '@forinda/kickjs'
import { StorageAdapter } from './adapters/storage.adapter'
import { modules } from './modules'

const adapters: AppAdapter[] = [StorageAdapter()]

// DevTools (/_debug) in `kick dev` only: the build sets __KICKJS_DEVTOOLS__ to false and
// drops this branch, so the package is not in the production bundle.
if (__KICKJS_DEVTOOLS__) {
  const { DevToolsAdapter } = await import('@forinda/kickjs-devtools')
  adapters.push(DevToolsAdapter())
}

export const app = await bootstrap({
  modules,
  runtime: expressRuntime(),
  adapters,
})
