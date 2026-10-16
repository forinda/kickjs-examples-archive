import { defineModule } from '@forinda/kickjs'
import { REDIS } from '@/adapters/redis.adapter'
import { ChatController } from './chat.controller'
// Importing the class is what registers its namespace with the WsAdapter.
import './chat.gateway'
import { createPresenceRepository, PRESENCE_REPOSITORY } from './presence.repository'

export const ChatModule = defineModule({
  name: 'ChatModule',
  build: () => ({
    register(container) {
      // Resolved on first use, after RedisAdapter (if configured) has bound REDIS.
      container.registerFactory(PRESENCE_REPOSITORY, () =>
        createPresenceRepository(container.has(REDIS) ? container.resolve(REDIS) : null),
      )
    },
    routes: () => ({ path: '/chat', controller: ChatController }),
  }),
})
